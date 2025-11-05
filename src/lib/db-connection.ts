import sql from 'mssql';

export interface DatabaseConnectionConfig {
  user: string;
  password: string;
  server: string;
  database: string;
  port?: number;
}

/**
 * إنشاء إعدادات اتصال محسّنة لـ SQL Server
 * تعمل مع Vercel Serverless Functions والشبكات البعيدة
 */
export function createDbConfig(config: DatabaseConnectionConfig): sql.config {
  // استخراج المنفذ من العنوان إذا كان موجوداً (server:port)
  let serverAddress = config.server;
  let port = config.port || 1433;
  
  if (serverAddress.includes(':')) {
    const parts = serverAddress.split(':');
    serverAddress = parts[0];
    port = parseInt(parts[1]) || 1433;
  }

  return {
    user: config.user,
    password: config.password,
    server: serverAddress,
    database: config.database,
    port: port,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: false, // تعطيل التشفير للشبكات الداخلية
      trustServerCertificate: true, // قبول الشهادات غير الموثوقة
      enableArithAbort: true,
      connectTimeout: 30000, // 30 ثانية timeout للاتصال
      requestTimeout: 60000, // 60 ثانية timeout للاستعلامات
      connectionRetryInterval: 500, // إعادة المحاولة كل 500ms
    },
    connectionTimeout: 30000, // timeout للاتصال الأولي
  };
}

/**
 * إنشاء اتصال بقاعدة البيانات مع معالجة الأخطاء المحسّنة
 */
export async function connectToDatabase(config: DatabaseConnectionConfig): Promise<sql.ConnectionPool> {
  const dbConfig = createDbConfig(config);
  
  try {
    const pool = await sql.connect(dbConfig);
    
    // اختبار الاتصال
    await pool.request().query('SELECT 1 AS test');
    
    return pool;
  } catch (error: any) {
    console.error('Database connection error:', {
      server: config.server,
      database: config.database,
      user: config.user,
      error: error.message,
      code: error.code,
    });
    
    // إعادة رمي الخطأ مع معلومات إضافية
    throw new Error(
      `فشل الاتصال بقاعدة البيانات: ${error.message || 'خطأ غير معروف'}. ` +
      `تأكد من أن SQL Server متاح على ${config.server}:${config.port || 1433} ` +
      `وأن Firewall يسمح بالاتصالات البعيدة.`
    );
  }
}

/**
 * إغلاق الاتصال بشكل آمن
 */
export async function closeConnection(pool: sql.ConnectionPool | null): Promise<void> {
  try {
    if (pool && pool.connected) {
      await pool.close();
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
    // لا نرمي الخطأ هنا لأننا نريد إغلاق الاتصال بأي حال
  }
}

