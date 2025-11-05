import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase, closeConnection } from '@/lib/db-connection'

export async function POST(request: NextRequest) {
  let pool = null;
  
  try {
    const supabase = await createClient()
    
    // التحقق من المستخدم المسجل دخول
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح به' },
        { status: 401 }
      )
    }

    // جلب معلومات الاتصال من Supabase
    const { data: connectionData, error: connectionError } = await supabase
      .from('user_database_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_connected_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (connectionError || !connectionData) {
      return NextResponse.json(
        { success: false, message: 'لم يتم إعداد اتصال بقاعدة البيانات' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { filters = {} } = body

    // إنشاء اتصال بقاعدة البيانات باستخدام الإعدادات المحسّنة
    pool = await connectToDatabase({
      user: connectionData.username,
      password: connectionData.password_encrypted,
      server: connectionData.server_address,
      database: connectionData.database_name,
      port: 1433,
    })
    
    // استعلام المنتجات الموشكة على النفاذ
    const query = `
      SELECT 
          p.ProductID_PK,
          p.ProductCode,
          p.ProductName,
          p.MinStockLevel,
          ISNULL(SUM(pi.StockOnHand), 0) AS StockOnHand,
          (ISNULL(SUM(pi.StockOnHand), 0) - p.MinStockLevel) AS Difference,
          CASE 
              WHEN ISNULL(SUM(pi.StockOnHand), 0) <= p.MinStockLevel 
              THEN N'ناقص' 
              ELSE N'كافي' 
          END AS Status
      FROM Inventory.Data_Products p
      LEFT JOIN Inventory.Data_ProductInventories pi 
          ON p.ProductID_PK = pi.ProductID_FK
      WHERE p.MinStockLevel > 0 
          AND p.IsInActive = 0
      GROUP BY p.ProductID_PK, p.ProductCode, p.ProductName, p.MinStockLevel
      HAVING ISNULL(SUM(pi.StockOnHand), 0) <= p.MinStockLevel
      ORDER BY StockOnHand ASC, p.ProductName
    `

    console.log('Executing low stock query...');
    
    const result = await pool.request().query(query)
    console.log('Query result rows:', result.recordset.length);
    
    await pool.close()

    // تحويل الأرقام من Decimal إلى Number
    const formattedData = result.recordset.map((record: any) => ({
      ProductID_PK: record.ProductID_PK,
      ProductCode: record.ProductCode,
      ProductName: record.ProductName,
      MinStockLevel: record.MinStockLevel ? parseFloat(record.MinStockLevel) : 0,
      StockOnHand: record.StockOnHand ? parseFloat(record.StockOnHand) : 0,
      Difference: record.Difference ? parseFloat(record.Difference) : 0,
      Status: record.Status || 'غير محدد',
    }));

    console.log('Sending response with data count:', formattedData.length);

    // إغلاق الاتصال قبل إرجاع النتيجة
    await closeConnection(pool)
    pool = null

    return NextResponse.json({
      success: true,
      data: formattedData,
    })
  } catch (error: any) {
    console.error('Error executing low stock report:', error)
    
    // إغلاق الاتصال في حالة الخطأ
    await closeConnection(pool)
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'حدث خطأ أثناء تنفيذ التقرير',
        error: error.code || 'UNKNOWN_ERROR',
      },
      { status: 500 }
    )
  } finally {
    // التأكد من إغلاق الاتصال في النهاية
    await closeConnection(pool)
  }
}

