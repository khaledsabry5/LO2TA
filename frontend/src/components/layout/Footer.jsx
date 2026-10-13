import { Link } from 'react-router-dom'
import WhatsAppIcon from '../icons/WhatsAppIcon'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer-wrapper">
      <div className="container-x footer-grid">
        <div className="footer-brand-col">
          <p dir="ltr" className="footer-logo">YSN</p>
          <p className="footer-brand-desc">
            إكسسوارات مختارة بعناية للرجال والنساء – أحذية، شنط، وساعات بجودة عالية وأسعار مميزة.
          </p>
        </div>

        <div className="footer-col">
          <h4 className="footer-col-title">الأقسام</h4>
          <ul className="footer-links-list">
            <li><Link to="/shop?gender=men" className="footer-link">الرجال</Link></li>
            <li><Link to="/shop?gender=women" className="footer-link">النساء</Link></li>
            <li><Link to="/shop?discounted=true" className="footer-link">العروض</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-col-title">التصنيفات</h4>
          <ul className="footer-links-list">
            <li><Link to="/shop?category=shoes" className="footer-link">الأحذية</Link></li>
            <li><Link to="/shop?category=bags" className="footer-link">الشنط</Link></li>
            <li><Link to="/shop?category=watches" className="footer-link">الساعات</Link></li>
          </ul>
        </div>

        {/* تواصل معنا (Contact Us) - Located immediately before Customer Service */}
        <div className="footer-col">
          <h4 className="footer-col-title">تواصل معنا</h4>
          <ul className="footer-links-list">
            <li>
              <a
                href="https://wa.me/201035707186"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-whatsapp-link"
              >
                <WhatsAppIcon className="footer-whatsapp-icon" />
                <span>واتساب: 1035707186 20+</span>
              </a>
            </li>
          </ul>
        </div>

        {/* خدمة العملاء (Customer Service) */}
        <div className="footer-col">
          <h4 className="footer-col-title">خدمة العملاء</h4>
          <ul className="footer-links-list">
            <li>شحن سريع لجميع المدن</li>
            <li>استبدال واسترجاع خلال 14 يوم</li>
            <li>الدفع عند الاستلام</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom-bar">
        © {new Date().getFullYear()} YSN Accessories Store. جميع الحقوق محفوظة.
      </div>
    </footer>
  )
}
