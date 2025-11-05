import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, closeConnection } from '@/lib/db-connection';

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

    const body = await request.json();
    const { server, user: dbUser, password, database, port } = body;

    // إنشاء اتصال مؤقت ببيانات المستخدم
    pool = await connectToDatabase({
      user: dbUser || 'sa',
      password: password || '',
      server: server || 'localhost',
      database: database || 'master',
      port: port || 1433,
    });
    
    // الحصول على معلومات قاعدة البيانات
    const versionResult = await pool.request().query('SELECT @@VERSION AS version');
    const serverNameResult = await pool.request().query('SELECT @@SERVERNAME AS serverName');
    const dbNameResult = await pool.request().query('SELECT DB_NAME() AS databaseName');
    
    await closeConnection(pool);
    pool = null;

    const version = versionResult.recordset[0]?.version || '';
    const serverName = serverNameResult.recordset[0]?.serverName || server || 'Unknown';
    const databaseName = dbNameResult.recordset[0]?.databaseName || database || 'Unknown';

    // استخراج رقم الإصدار من النص الكامل
    const versionMatch = version.match(/SQL Server (\d{4})/);
    const versionNumber = versionMatch ? versionMatch[1] : 'Unknown';

    const connectionData = {
      serverName,
      databaseName,
      version: versionNumber,
      fullVersion: version,
      connectionInfo: {
        server,
        database,
        user: dbUser,
      },
    };

    // حفظ معلومات الاتصال في Supabase - استخدام upsert محسّن
    // كلمة المرور محفوظة في Supabase فقط - لا يتم إرجاعها
    const now = new Date().toISOString();
    const { error: saveError } = await supabase
      .from('user_database_connections')
      .upsert({
        user_id: user.id,
        server_name: serverName,
        server_address: server,
        database_name: databaseName,
        username: dbUser,
        password_encrypted: password, // محفوظ في Supabase فقط - لا يتم إرجاعه
        sql_server_version: versionNumber,
        sql_server_full_version: version,
        is_active: true,
        last_connected_at: now,
        updated_at: now,
      }, {
        onConflict: 'user_id,server_address,database_name',
      })

    if (saveError) {
      console.error('Error saving connection:', saveError);
      // لا نوقف العملية إذا فشل الحفظ، فقط نرجع البيانات
    }

    return NextResponse.json({
      success: true,
      message: 'تم الاتصال بقاعدة البيانات بنجاح',
      data: connectionData,
    });
  } catch (error: any) {
    console.error('خطأ في الاتصال:', error);
    
    // إغلاق الاتصال في حالة الخطأ
    await closeConnection(pool);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'حدث خطأ أثناء الاتصال',
        error: error.code || 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }
}
