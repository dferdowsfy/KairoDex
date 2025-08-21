"use client"
export default function NoteComposer({ onSave }: { onSave: (text: string) => void }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-card to-primarySoft/30 p-3 border border-slate-200">
  <textarea aria-label="New note" placeholder="Write a note…" id="nc_text" className="w-full input-neon placeholder:text-ink/60 px-3 py-2" />
      <div className="mt-2 flex gap-2">
        <button className="bg-primary hover:bg-blue-600 text-white rounded-lg px-3 py-1.5 shadow-sm" onClick={() => { const el = document.getElementById('nc_text') as HTMLTextAreaElement; onSave(el.value); el.value = '' }}>Save</button>
  <button className="bg-white/80 text-ink/80 border border-white/50 hover:bg-white rounded-lg px-3 py-1.5">Cancel</button>
      </div>
    </div>
  )
}
