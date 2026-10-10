import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
          <div className="card max-w-md p-8">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sale/10 text-sale">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-extrabold text-ink">حدث خطأ أثناء عرض الصفحة</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {this.state.error?.message || 'حدث خطأ غير متوقع في واجهة المستخدم.'}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-dark mt-6 w-full"
            >
              <RefreshCw className="h-4 w-4" /> إعادة المحاولة
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
