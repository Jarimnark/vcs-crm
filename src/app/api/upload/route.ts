// G4: uploads go through a Route Handler, never a Server Action — the 1 MB
// action body limit stays at its default, and a 4 MB phone photo lands here
// instead: own auth check, size cap, MIME allowlist, resize on arrival
// (sharp, already required for disk reasons — ADR-0036).
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024 // reject before buffering more than this
const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
])
const MAX_DIMENSION = 1600 // px — receipts and product photos need no more

export async function POST(req: Request) {
  try {
    await requireSession()
  } catch {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (10 MB max)' }, { status: 413 })
  }

  const input = Buffer.from(await file.arrayBuffer())
  // Re-encode via sharp: shrinks phone photos AND guarantees the stored file
  // really is an image, whatever the client claimed.
  let output: Buffer
  try {
    output = await sharp(input)
      .rotate() // honour EXIF orientation
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'Not a valid image' }, { status: 415 })
  }

  const mediaRoot = path.resolve(process.env.MEDIA_ROOT ?? './media')
  const now = new Date()
  const dir = path.join('uploads', String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'))
  await fs.mkdir(path.join(mediaRoot, dir), { recursive: true })
  const name = `${crypto.randomUUID()}.jpg`
  const relPath = path.join(dir, name)
  await fs.writeFile(path.join(mediaRoot, relPath), output)

  return NextResponse.json({ path: relPath, bytes: output.length })
}
