import NextErrorComponent, { type ErrorProps } from 'next/error'
import type { NextPageContext } from 'next'

// Minimal legacy error page to satisfy runtime modules and PWA precache in App Router projects
function CustomError({ statusCode }: ErrorProps) {
  return <NextErrorComponent statusCode={statusCode} />
}

CustomError.getInitialProps = async (ctx: NextPageContext) => {
  const errorInitialProps = await NextErrorComponent.getInitialProps(ctx)
  return { ...errorInitialProps }
}

export default CustomError
