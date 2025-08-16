"use client"
export default function NoteComposer({ onSave }: { onSave: (text: string) => void }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-card to-primarySoft/30 p-3 border border-slate-200">
      <textarea aria-label="New note" placeholder="Write a note…" id="nc_text" className="w-full bg-white text-slate-800 placeholder:text-slate-400 border border-slate-300 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <div className="mt-2 flex gap-2">
        <button className="bg-primary hover:bg-blue-600 text-white rounded-lg px-3 py-1.5 shadow-sm" onClick={() => { const el = document.getElementById('nc_text') as HTMLTextAreaElement; onSave(el.value); el.value = '' }}>Save</button>
        <button className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-1.5">Cancel</button>
      </div>
    </div>
  )
}
