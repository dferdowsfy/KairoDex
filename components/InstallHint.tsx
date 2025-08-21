"use client"
import * as React from 'react'

export default function InstallHint() {
  const [prompt, setPrompt] = React.useState<any>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler as any)
    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  if (!visible) return null
  return (
    <div className="fixed bottom-20 inset-x-4 glass p-3 rounded-xl text-sm">
      <div className="flex items-center gap-3">
        <span>Install NestAI for a native feel.</span>
        <button className="ml-auto bg-primary text-white px-3 py-1 rounded-lg" onClick={async() => { await prompt?.prompt(); setVisible(false)}}>Install</button>
  <button className="text-ink/50" onClick={() => setVisible(false)}>Later</button>
      </div>
    </div>
  )
}
