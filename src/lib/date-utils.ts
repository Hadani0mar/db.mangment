// دالة لتحويل التاريخ إلى صيغة عربية (ميلادي فقط)
export function formatDateArabic(dateString: string): string {
  const date = new Date(dateString);
  
  // التقويم الميلادي
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  // أسماء الأشهر الميلادية
  const gregorianMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  
  const formattedGregorian = `${day} ${gregorianMonths[month - 1]} ${year}`;
  
  return formattedGregorian;
}

// دالة لتحويل التاريخ إلى صيغة عربية مع الوقت (ميلادي فقط)
export function formatDateTimeArabic(dateString: string): string {
  const date = new Date(dateString);
  
  // التقويم الميلادي
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // أسماء الأشهر الميلادية
  const gregorianMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const formattedGregorian = `${day} ${gregorianMonths[month - 1]} ${year}`;
  
  return `${formattedGregorian} - ${formattedTime}`;
}

