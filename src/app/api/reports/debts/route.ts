import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import sql from 'mssql'

export async function POST(request: NextRequest) {
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

    // إنشاء اتصال بقاعدة البيانات
    const config: sql.config = {
      user: connectionData.username,
      password: connectionData.password_encrypted,
      server: connectionData.server_address,
      database: connectionData.database_name,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
    }

    const pool = await sql.connect(config)
    
    // بناء الاستعلام مع الفلاتر
    let query = `
      SELECT 
          cpa.CustomerPAppointmentID_PK AS [معرف_الموعد],
          cpa.SalesInvoiceNumber AS [رقم_الفاتورة],
          cpa.PAppointmentDate AS [تاريخ_الاستحقاق],
          cpa.PaymentAmount AS [المبلغ_المطلوب],
          c.CustomerName AS [اسم_العميل],
          CASE 
              WHEN cpa.IsDone = 1 THEN N'تم الدفع'
              ELSE N'لم يتم الدفع'
          END AS [حالة_الدفع],
          cpa.PAppointmentDescription AS [الملاحظة],
          cpa.CreatedByUserName AS [المستخدم_الذي_أضافه],
          cpa.CreatedDate AS [تاريخ_الإضافة]
      FROM 
          SALES.Data_CustomerPaymentAppointments cpa
      LEFT JOIN 
          SALES.Data_Customers c ON cpa.CustomerID_FK = c.CustomerID_PK
      WHERE 1=1
    `

    // إضافة الفلاتر
    if (filters.unpaidOnly) {
      query += ` AND cpa.IsDone = 0`
    }

    if (filters.dueToday) {
      query += ` AND CAST(cpa.PAppointmentDate AS DATE) = CAST(GETDATE() AS DATE)`
    }

    if (filters.dateFrom) {
      query += ` AND CAST(cpa.PAppointmentDate AS DATE) >= '${filters.dateFrom}'`
    }

    if (filters.dateTo) {
      query += ` AND CAST(cpa.PAppointmentDate AS DATE) <= '${filters.dateTo}'`
    }

    query += ` ORDER BY cpa.PAppointmentDate DESC`

    console.log('Executing query:', query);
    
    const result = await pool.request().query(query)
    console.log('Query result rows:', result.recordset.length);
    console.log('First record:', result.recordset[0]);
    
    await pool.close()

    // استعلام إحصائي
    const statsQuery = `
      SELECT 
          COUNT(*) AS [إجمالي_المواعيد],
          SUM(cpa.PaymentAmount) AS [إجمالي_المبالغ],
          SUM(CASE WHEN cpa.IsDone = 1 THEN 1 ELSE 0 END) AS [المواعيد_المدفوعة],
          SUM(CASE WHEN cpa.IsDone = 0 THEN 1 ELSE 0 END) AS [المواعيد_المعلقة],
          SUM(CASE WHEN cpa.IsDone = 0 THEN cpa.PaymentAmount ELSE 0 END) AS [المبالغ_المعلقة]
      FROM 
          SALES.Data_CustomerPaymentAppointments cpa
    `

    const statsPool = await sql.connect(config)
    const statsResult = await statsPool.request().query(statsQuery)
    await statsPool.close()

    console.log('Stats result:', statsResult.recordset[0]);

    // تحويل الأرقام من Decimal إلى Number
    const formattedData = result.recordset.map((record: any) => {
      const formatted = {
        ...record,
        المبلغ_المطلوب: record.المبلغ_المطلوب ? parseFloat(record.المبلغ_المطلوب) : 0,
      };
      console.log('Formatted record:', formatted);
      return formatted;
    });

    const stats = statsResult.recordset[0] || {
      إجمالي_المواعيد: 0,
      إجمالي_المبالغ: 0,
      المواعيد_المدفوعة: 0,
      المواعيد_المعلقة: 0,
      المبالغ_المعلقة: 0
    };

    // تحويل الأرقام في الإحصائيات
    const formattedStats = {
      إجمالي_المواعيد: stats.إجمالي_المواعيد ? parseInt(stats.إجمالي_المواعيد) : 0,
      إجمالي_المبالغ: stats.إجمالي_المبالغ ? parseFloat(stats.إجمالي_المبالغ) : 0,
      المواعيد_المدفوعة: stats.المواعيد_المدفوعة ? parseInt(stats.المواعيد_المدفوعة) : 0,
      المواعيد_المعلقة: stats.المواعيد_المعلقة ? parseInt(stats.المواعيد_المعلقة) : 0,
      المبالغ_المعلقة: stats.المبالغ_المعلقة ? parseFloat(stats.المبالغ_المعلقة) : 0,
    };

    console.log('Sending response with data count:', formattedData.length);

    return NextResponse.json({
      success: true,
      data: formattedData,
      statistics: formattedStats
    })
  } catch (error: any) {
    console.error('Error executing debts report:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'حدث خطأ أثناء تنفيذ التقرير',
        error: error.code || 'UNKNOWN_ERROR',
      },
      { status: 500 }
    )
  }
}

