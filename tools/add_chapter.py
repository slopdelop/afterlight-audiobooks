"""Add a published MP3 chapter or a new book to the static catalog."""
import argparse,json,shutil,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--book',required=True,help='Stable book ID');p.add_argument('--book-title',help='Required for a new book');p.add_argument('--narrator',default='Personal audio edition');p.add_argument('--chapter',type=int,required=True);p.add_argument('--title',required=True);p.add_argument('--duration',type=float,required=True,help='Audio duration in seconds');p.add_argument('--file',type=Path,required=True);p.add_argument('--transcript',type=Path,help='Optional paragraph-timed JSON for reading/listening sync');args=p.parse_args()
if not re.fullmatch('[a-z0-9-]+',args.book) or args.chapter<1 or args.duration<=0:p.error('Use a lowercase hyphenated book ID, positive chapter number and duration.')
if args.file.suffix.lower()!='.mp3' or not args.file.is_file():p.error('Choose an existing MP3 file.')
path=root/'catalog.json';data=json.loads(path.read_text(encoding='utf-8-sig'));book=next((b for b in data['books'] if b['id']==args.book),None)
if not book:
 if not args.book_title:p.error('--book-title is required for a new book.')
 book={'id':args.book,'title':args.book_title,'narrator':args.narrator,'cover':'assets/icon-512.png','ongoing':True,'chapters':[]};data['books'].append(book)
if any(c['number']==args.chapter for c in book['chapters']):p.error('This chapter number already exists; refusing to overwrite.')
transcript=None
if args.transcript:
 transcript=json.loads(args.transcript.read_text(encoding='utf-8-sig'))
 expected=f'{args.book}-{args.chapter:02}'
 if transcript.get('version')!=1 or transcript.get('chapterId')!=expected or abs(transcript.get('duration',0)-args.duration)>.5:p.error('Transcript must use the chapter ID and actual audio duration.')
 previous=-1;ids=set()
 for cue in transcript.get('paragraphs',[]):
  if not cue.get('text','').strip() or cue.get('id') in ids or not 0<=cue.get('start',-1)<cue.get('end',-1)<=args.duration+.5 or cue['start']<=previous:p.error('Transcript requires unique IDs, text and ordered in-range timings.')
  ids.add(cue['id']);previous=cue['start']
 if not ids:p.error('Transcript has no paragraphs.')
relative=f'audio/{args.book}/chapter-{args.chapter:02}.mp3';dest=root/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(args.file,dest)
book['chapters'].append({'id':f'{args.book}-{args.chapter:02}','number':args.chapter,'title':args.title,'src':relative,'duration':args.duration});
if transcript:
 text_relative=f'text/{args.book}/chapter-{args.chapter:02}.json';text_dest=root/text_relative;text_dest.parent.mkdir(parents=True,exist_ok=True);text_dest.write_text(json.dumps(transcript,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');book['chapters'][-1]['transcript']=text_relative
book['chapters'].sort(key=lambda c:c['number']);path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print('Added',relative,'— commit and push to publish.')
