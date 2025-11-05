import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { connectToDatabase, closeConnection } from '@/lib/db-connection';

export async function POST(request: NextRequest) {
  let pool = null;
  
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 }
      );
    }

    // الحصول على معلومات الاتصال
    const { data: connectionData, error: connectionError } = await supabase
      .from('user_database_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_connected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connectionError || !connectionData) {
      return NextResponse.json(
        { success: false, message: 'لم يتم إعداد اتصال بقاعدة البيانات' },
        { status: 400 }
      );
    }

    // استعلام SQL لتقرير الأصناف المطلوبة
    const query = `
SET NOCOUNT ON;

-- 0) إعدادات
DECLARE @end DATE  = CAST(GETDATE() AS DATE);
DECLARE @window_days INT = 60;
DECLARE @start DATE = DATEADD(DAY, -(@window_days-1), @end);
DECLARE @pre_window_days_target INT = CAST(FLOOR(0.5 * @window_days) AS INT);
DECLARE @hist_days  INT  = @window_days + @pre_window_days_target + 30;
DECLARE @hist_start DATE = DATEADD(DAY, -(@hist_days-1), @end);

-- 1) المنتجات
IF OBJECT_ID('tempdb..#PIG') IS NOT NULL DROP TABLE #PIG;
CREATE TABLE #PIG(ProductID INT PRIMARY KEY, ProductName NVARCHAR(400), ProductCode NVARCHAR(100));
INSERT INTO #PIG(ProductID, ProductName, ProductCode)
SELECT p.ProductID_PK, p.ProductName, p.ProductCode
FROM Inventory.Data_Products p;

-- 2) عامل العبوة (UOM)
IF OBJECT_ID('tempdb..#UOM') IS NOT NULL DROP TABLE #UOM;
CREATE TABLE #UOM(ProductID INT PRIMARY KEY, PackFactor DECIMAL(18,6) NOT NULL);
;WITH UOM_Ref AS (
    SELECT pu.ProductID_FK AS ProductID,
           CAST(pu.BaseUnitQYT AS DECIMAL(18,6)) AS PackFactor
    FROM Inventory.Data_ProductUOMs pu
    JOIN Inventory.RefUOMs u ON u.UOMID_PK = pu.UomID_FK
    WHERE u.UOMName IN (N'عبوة',N'علبة',N'Pack',N'PACK') OR u.UOMName LIKE N'%عبو%' OR u.UOMName LIKE N'%علبة%'
),
UOM_Inferred AS (
    SELECT ProductID_FK AS ProductID,
           CAST(COALESCE(UnitBaseQYT,1) AS DECIMAL(18,6)) AS PackFactor,
           ROW_NUMBER() OVER (PARTITION BY ProductID_FK ORDER BY COUNT_BIG(*) DESC) rn
    FROM SALES.Data_SalesInvoiceItems
    GROUP BY ProductID_FK, COALESCE(UnitBaseQYT,1)
)
INSERT INTO #UOM
SELECT p.ProductID,
       COALESCE(r.PackFactor, ii.PackFactor, 1.0) AS PackFactor
FROM #PIG p
LEFT JOIN UOM_Ref r      ON r.ProductID = p.ProductID
LEFT JOIN (SELECT ProductID, PackFactor FROM UOM_Inferred WHERE rn=1) ii ON ii.ProductID = p.ProductID;

-- 3) تقويم التواريخ
IF OBJECT_ID('tempdb..#Dates') IS NOT NULL DROP TABLE #Dates;
CREATE TABLE #Dates (d DATE PRIMARY KEY);
;WITH N AS (SELECT TOP (@hist_days) ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) - 1 AS n FROM sys.all_objects)
INSERT INTO #Dates SELECT DATEADD(DAY,n,@hist_start) FROM N;

-- 4) الحركات اليومية بالعبوة + الرصيد الافتتاحي
IF OBJECT_ID('tempdb..#DailyAgg') IS NOT NULL DROP TABLE #DailyAgg;
CREATE TABLE #DailyAgg(ProductID INT, d DATE, NetQTY_Pack DECIMAL(18,6));
INSERT INTO #DailyAgg
SELECT t.ProductID_FK,
       CAST(t.TransactionDate AS DATE),
       SUM(CAST(t.TransactionQYT AS DECIMAL(18,6))/NULLIF(u.PackFactor,0))
FROM Inventory.Data_InventoryTransactions t
JOIN #UOM u ON u.ProductID=t.ProductID_FK
WHERE CAST(t.TransactionDate AS DATE) BETWEEN @hist_start AND @end
  AND t.ProductID_FK IN (SELECT ProductID FROM #PIG)
GROUP BY t.ProductID_FK, CAST(t.TransactionDate AS DATE);

IF OBJECT_ID('tempdb..#Opening') IS NOT NULL DROP TABLE #Opening;
CREATE TABLE #Opening(ProductID INT PRIMARY KEY, OpeningQTY_Pack DECIMAL(18,6));
INSERT INTO #Opening
SELECT t.ProductID_FK,
       COALESCE(SUM(CAST(t.TransactionQYT AS DECIMAL(18,6))/NULLIF(u.PackFactor,0)),0)
FROM Inventory.Data_InventoryTransactions t
JOIN #UOM u ON u.ProductID=t.ProductID_FK
WHERE CAST(t.TransactionDate AS DATE) < @hist_start
  AND t.ProductID_FK IN (SELECT ProductID FROM #PIG)
GROUP BY t.ProductID_FK;

-- 5) رصيد نهاية اليوم (EOD) بالعبوة
IF OBJECT_ID('tempdb..#Cumu') IS NOT NULL DROP TABLE #Cumu;
CREATE TABLE #Cumu(ProductID INT, d DATE, EOD_Pack DECIMAL(18,6));
INSERT INTO #Cumu
SELECT p.ProductID,
       dt.d,
       CAST(COALESCE(op.OpeningQTY_Pack,0) +
            SUM(COALESCE(da.NetQTY_Pack,0)) OVER (PARTITION BY p.ProductID ORDER BY dt.d ROWS UNBOUNDED PRECEDING)
            AS DECIMAL(18,6)) AS EOD_Pack
FROM #PIG p
CROSS JOIN #Dates dt
LEFT JOIN #DailyAgg da ON da.ProductID=p.ProductID AND da.d=dt.d
LEFT JOIN #Opening  op ON op.ProductID=p.ProductID;

-- 6) أيام التوفر المعتمدة
IF OBJECT_ID('tempdb..#Avail') IS NOT NULL DROP TABLE #Avail;
CREATE TABLE #Avail(ProductID INT PRIMARY KEY, Days_in_window INT, PreRun_Capped INT, DaysApproved INT);
;WITH Win AS (
    SELECT ProductID,
           SUM(CASE WHEN d BETWEEN @start AND @end AND EOD_Pack>0 THEN 1 ELSE 0 END) AS Days_in_window
    FROM #Cumu GROUP BY ProductID
),
PreCnt AS (
    SELECT ProductID,
           SUM(CASE WHEN d<@start AND EOD_Pack>0 THEN 1 ELSE 0 END) AS PreHave
    FROM #Cumu GROUP BY ProductID
)
INSERT INTO #Avail
SELECT p.ProductID,
       COALESCE(w.Days_in_window,0),
       CASE WHEN COALESCE(pc.PreHave,0)>=@pre_window_days_target THEN @pre_window_days_target ELSE COALESCE(pc.PreHave,0) END,
       COALESCE(w.Days_in_window,0) + CASE WHEN COALESCE(pc.PreHave,0)>=@pre_window_days_target THEN @pre_window_days_target ELSE COALESCE(pc.PreHave,0) END
FROM #PIG p
LEFT JOIN Win   w  ON w.ProductID=p.ProductID
LEFT JOIN PreCnt pc ON pc.ProductID=p.ProductID;

IF OBJECT_ID('tempdb..#ApprovedDays') IS NOT NULL DROP TABLE #ApprovedDays;
CREATE TABLE #ApprovedDays(ProductID INT, d DATE);
INSERT INTO #ApprovedDays
SELECT ProductID,d FROM #Cumu
WHERE d BETWEEN @start AND @end AND EOD_Pack>0;

;WITH PreCand AS (
    SELECT c.ProductID, c.d,
           ROW_NUMBER() OVER(PARTITION BY c.ProductID ORDER BY c.d DESC) rn
    FROM #Cumu c
    JOIN #Avail af ON af.ProductID=c.ProductID
    WHERE c.EOD_Pack>0
      AND c.d BETWEEN DATEADD(DAY,-af.PreRun_Capped,@start) AND DATEADD(DAY,-1,@start)
)
INSERT INTO #ApprovedDays
SELECT pc.ProductID, pc.d
FROM PreCand pc
JOIN #Avail af ON af.ProductID=pc.ProductID
WHERE pc.rn<=af.PreRun_Capped;

-- 7) المبيعات المعتمدة
IF OBJECT_ID('tempdb..#SalesDaily') IS NOT NULL DROP TABLE #SalesDaily;
CREATE TABLE #SalesDaily(ProductID INT, d DATE, SalesBase DECIMAL(18,6));
INSERT INTO #SalesDaily
SELECT sii.ProductID_FK,
       CAST(si.SalesInvoiceDate AS DATE),
       SUM(CAST(COALESCE(sii.UnitBaseQYT,1) AS DECIMAL(18,6)) * sii.QYT)
FROM SALES.Data_SalesInvoiceItems sii
JOIN SALES.Data_SalesInvoices si ON si.SalesInvoiceID_PK=sii.SalesInvoiceID_FK
WHERE CAST(si.SalesInvoiceDate AS DATE) BETWEEN @hist_start AND @end
  AND sii.ProductID_FK IN (SELECT ProductID FROM #PIG)
GROUP BY sii.ProductID_FK, CAST(si.SalesInvoiceDate AS DATE);

IF OBJECT_ID('tempdb..#SalesApproved') IS NOT NULL DROP TABLE #SalesApproved;
CREATE TABLE #SalesApproved(ProductID INT PRIMARY KEY, SalesQTY_Pack DECIMAL(18,6), AvgDaily_Pack DECIMAL(18,6));
INSERT INTO #SalesApproved(ProductID, SalesQTY_Pack, AvgDaily_Pack)
SELECT ad.ProductID,
       CAST(SUM(COALESCE(sd.SalesBase,0))/NULLIF(u.PackFactor,0) AS DECIMAL(18,6)) AS SalesQTY_Pack,
       CAST(CASE WHEN af.DaysApproved>0
                 THEN (SUM(COALESCE(sd.SalesBase,0))/NULLIF(u.PackFactor,0)) * 1.0 / af.DaysApproved
                 ELSE 0 END AS DECIMAL(18,6)) AS AvgDaily_Pack
FROM #ApprovedDays ad
LEFT JOIN #SalesDaily sd ON sd.ProductID=ad.ProductID AND sd.d=ad.d
LEFT JOIN #UOM u        ON u.ProductID=ad.ProductID
JOIN #Avail af          ON af.ProductID=ad.ProductID
GROUP BY ad.ProductID, u.PackFactor, af.DaysApproved;

-- 8) مخزون نهاية الفترة
IF OBJECT_ID('tempdb..#EODPack') IS NOT NULL DROP TABLE #EODPack;
CREATE TABLE #EODPack(ProductID INT PRIMARY KEY, Stock_Pack DECIMAL(18,6));
INSERT INTO #EODPack
SELECT c.ProductID, CAST(c.EOD_Pack AS DECIMAL(18,6))
FROM #Cumu c
WHERE c.d=@end;

-- 9) مدة نفاذ المخزون
IF OBJECT_ID('tempdb..#Runout') IS NOT NULL DROP TABLE #Runout;
CREATE TABLE #Runout(ProductID INT PRIMARY KEY, DaysOfCover DECIMAL(18,1));
INSERT INTO #Runout
SELECT p.ProductID,
       CAST(CASE WHEN COALESCE(sa.AvgDaily_Pack,0)>0
                 THEN (COALESCE(eop.Stock_Pack,0)/sa.AvgDaily_Pack)
                 ELSE NULL END AS DECIMAL(18,1)) AS DaysOfCover
FROM #PIG p
LEFT JOIN #SalesApproved sa ON sa.ProductID=p.ProductID
LEFT JOIN #EODPack      eop ON eop.ProductID=p.ProductID;

-- 10) الإخراج النهائي
SELECT P.ProductName AS [اسم_الصنف],
       P.ProductCode AS [كود_الصنف],
       R.DaysOfCover AS [مدة_نفاذ_المخزون]
FROM #PIG P
JOIN #Avail AF   ON AF.ProductID = P.ProductID
LEFT JOIN #Runout R ON R.ProductID = P.ProductID
WHERE AF.DaysApproved > 0
ORDER BY [مدة_نفاذ_المخزون] ASC;
    `;

    // الاتصال بقاعدة البيانات باستخدام الإعدادات المحسّنة
    pool = await connectToDatabase({
      user: connectionData.username,
      password: connectionData.password_encrypted,
      server: connectionData.server_address,
      database: connectionData.database_name,
      port: 1433,
    });
    
    const result = await pool.request().query(query);
    
    // إغلاق الاتصال قبل إرجاع النتيجة
    await closeConnection(pool)
    pool = null

    return NextResponse.json({
      success: true,
      data: result.recordset || [],
    });
  } catch (error: unknown) {
    console.error("Error executing required items report:", error);
    
    // إغلاق الاتصال في حالة الخطأ
    await closeConnection(pool)
    
    const errorMessage =
      error instanceof Error ? error.message : "حدث خطأ غير متوقع";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  } finally {
    // التأكد من إغلاق الاتصال في النهاية
    await closeConnection(pool)
  }
}

