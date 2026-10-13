import { Globe } from 'lucide-react'
import './SubFooter.css'

const SUB_FOOTER_LINKS = [
  { label: 'تفضيلات ملفات تعريف الارتباط', href: '#' },
  { label: 'سياسة الخصوصية', href: '#' },
  { label: 'أحكام الشراء', href: '#' },
  { label: 'سياسة ملفات تعريف الارتباط', href: '#' },
  { label: 'استخدام الذكاء الاصطناعي', href: '#' },
]

export default function SubFooter() {
  return (
    <div className="subfooter-wrapper">
      <div className="subfooter-container">
        <nav aria-label="Legal & Information" className="subfooter-nav">
          <ul className="subfooter-links">
            {SUB_FOOTER_LINKS.map((link, index) => (
              <li key={index} className="subfooter-item">
                <a
                  href={link.href}
                  className="subfooter-link"
                  onClick={(e) => link.href === '#' && e.preventDefault()}
                >
                  {link.label}
                </a>
                {index < SUB_FOOTER_LINKS.length - 1 && (
                  <span className="subfooter-separator" aria-hidden="true">
                    |
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="subfooter-locale">
          <Globe className="subfooter-locale-icon" aria-hidden="true" />
          <span>مصر | العربي</span>
        </div>
      </div>
    </div>
  )
}
