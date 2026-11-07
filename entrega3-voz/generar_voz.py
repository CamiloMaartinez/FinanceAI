# Genera la narración de Moni con voces neuronales en español (edge-tts).
# Uso: python generar_voz.py   -> crea mp3/<id>.mp3
import asyncio, json, os, sys
import edge_tts

VOZ = sys.argv[1] if len(sys.argv) > 1 else 'es-CO-SalomeNeural'
base = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(base, 'mp3'), exist_ok=True)

async def main():
    for id_, _, _, texto in json.load(open(os.path.join(base, 'narracion.json'), encoding='utf-8')):
        out = os.path.join(base, 'mp3', id_ + '.mp3')
        await edge_tts.Communicate(texto, VOZ, rate='+4%').save(out)
        print('ok', id_)

asyncio.run(main())
