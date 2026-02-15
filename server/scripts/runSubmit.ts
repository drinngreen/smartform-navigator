import { submitFir } from '../rentriClient'

async function main(){
  const filename = (process.argv[2] || 'certificato.p12')
  const today = new Date().toISOString().slice(0,10)
  const xml = `
<registro_carico_scarico>
  <movimenti>
    <movimento>
      <progressivo>TEST</progressivo>
      <data>${today}</data>
      <tipo>CA</tipo>
      <descrizione>Prova movimento</descrizione>
      <codice_cer>170407</codice_cer>
      <quantita>1</quantita>
      <unita_misura>KG</unita_misura>
    </movimento>
  </movimenti>
</registro_carico_scarico>`
  try {
    const res = await submitFir(xml, filename)
    console.log(JSON.stringify(res))
  } catch (e:any) {
    console.log(JSON.stringify({ success:false, error: String(e?.message||e) }))
    process.exitCode = 1
  }
}

main()
