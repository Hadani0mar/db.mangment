import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    const body = await request.json()
    const {
      serverName,
      serverAddress,
      databaseName,
      username,
      password,
      sqlServerVersion,
      sqlServerFullVersion,
    } = body

    // حفظ أو تحديث معلومات الاتصال
    const { data, error } = await supabase
      .from('user_database_connections')
      .upsert({
        user_id: user.id,
        server_name: serverName,
        server_address: serverAddress,
        database_name: databaseName,
        username: username,
        password_encrypted: password, // محفوظ في Supabase فقط - لا يتم إرجاعه
        sql_server_version: sqlServerVersion,
        sql_server_full_version: sqlServerFullVersion,
        is_active: true,
        last_connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,server_address,database_name',
      })
      .select('id, user_id, server_name, server_address, database_name, username, sql_server_version, sql_server_full_version, is_active, last_connected_at, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error saving connection:', error)
      return NextResponse.json(
        { success: false, message: 'فشل حفظ الاتصال: ' + error.message },
        { status: 500 }
      )
    }

    // إرجاع البيانات بدون password_encrypted
    return NextResponse.json({
      success: true,
      message: 'تم حفظ معلومات الاتصال بنجاح',
      data,
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: 'حدث خطأ: ' + error.message },
      { status: 500 }
    )
  }
}

