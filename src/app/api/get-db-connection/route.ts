import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
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

    // جلب آخر اتصال نشط للمستخدم - استعلام محسّن
    const { data, error } = await supabase
      .from('user_database_connections')
      .select('id, server_name, server_address, database_name, username, sql_server_version, sql_server_full_version, last_connected_at, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_connected_at', { ascending: false })
      .limit(1)
      .maybeSingle() // استخدام maybeSingle بدلاً من single لتجنب خطأ عند عدم وجود بيانات

    if (error) {
      console.error('Error fetching connection:', error)
      return NextResponse.json(
        { success: false, message: 'فشل جلب الاتصال: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || null,
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: 'حدث خطأ: ' + error.message },
      { status: 500 }
    )
  }
}

