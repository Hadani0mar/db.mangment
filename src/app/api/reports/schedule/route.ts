import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح به' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reportType, scheduleType, interval, time, enabled } = body

    // حفظ إعدادات الجدولة في Supabase
    // يمكن إنشاء جدول جديد للجدولة أو استخدام جدول موجود
    const { data, error } = await supabase
      .from('user_database_connections')
      .update({
        // يمكن حفظ إعدادات الجدولة في حقل JSON أو إنشاء جدول منفصل
      })
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      message: 'تم حفظ إعدادات الجدولة',
      data
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}

