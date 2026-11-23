import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'

export async function installPro(directory, id, version, { manager='pnpm', dryRun=false, channel='personal' }={}) {
  const address=process.env.SYNTROFIC_PRO_ADDRESS
  const token=process.env[channel==='ci'?'SYNTROFIC_PRO_CI_TOKEN':'SYNTROFIC_PRO_TOKEN']
  if (!address || !token) throw new Error('Pro endpoint and scoped token are required')
  if (!['pnpm','npm','yarn','bun'].includes(manager) || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id) || !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version))
    throw new Error('Invalid package manager, product ID or version')
  const base=new URL(address)
  if (!(base.protocol==='https:' || base.protocol==='http:'&& ['localhost','127.0.0.1'].includes(base.hostname)) || base.username || base.password)
    throw new Error('Invalid Pro endpoint')
  const options={headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(16000)}
  const response=await fetch(new URL('/'+id+'/'+version,base),options)
  if (!response.ok) throw new Error('Release access denied or version unavailable')
  const release=await response.json()
  if (release.id!==id||release.version!==version||!/^[a-f0-9]{64}$/i.test(release.sha256)) throw new Error('Unexpected release manifest')
  const archive=new URL(release.archive,base)
  if (archive.origin!==base.origin) throw new Error('Archive origin does not match Pro endpoint')
  const cache=resolve(directory,'.syntrofic-cache')
  const path=resolve(cache,id+'-'+version+'-'+release.sha256.slice(0,12)+'.tgz')
  if (dryRun) return {id,version,path,sha256:release.sha256}
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
  let bytes
  try { bytes=await readFile(path) } catch (error) { if(error.code!=='ENOENT') throw error }
  if (!bytes || hash(bytes)!==release.sha256) {
    const download=await fetch(archive,options)
    if (!download.ok) throw new Error('Archive access denied')
    bytes=Buffer.from(await download.arrayBuffer())
    if (hash(bytes)!==release.sha256) throw new Error('Pro archive checksum did not match')
    await mkdir(cache,{recursive:true})
    const tmp=path+'.'+randomUUID()
    await writeFile(tmp,bytes,{flag:'wx'})
    await rename(tmp,path)
  }
  const result=spawnSync(manager,[manager==='npm'?'install':'add',path],{cwd:directory,stdio:'inherit'})
  if (result.error || result.status!==0) throw result.error??new Error('Package installation failed')
  return {id,version,path,sha256:release.sha256}
}
