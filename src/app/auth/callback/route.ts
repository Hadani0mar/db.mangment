import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type') // نوع العملية: recovery = password reset
    
    if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        // إذا كان نوع العملية هو password recovery، توجه إلى صفحة إعادة تعيين كلمة المرور
        if (type === 'recovery') {
          return NextResponse.redirect(`${origin}/auth/reset-password`)
        }
        
        // توجيه المستخدم إلى صفحة تكوين قاعدة البيانات بعد تسجيل الدخول الناجح
        return NextResponse.redirect(`${origin}/database-setup`)
      }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${new URL(request.url).origin}/`)
  }
}

