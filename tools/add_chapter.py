"""Add a published MP3 chapter or a new book to the static catalog."""
import argparse,json,shutil,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--book',required=True,help='Stable book ID');p.add_argument('--book-title',help='Required for a new book');p.add_argument('--narrator',default='Personal audio edition');p.add_argument('--chapter',type=int,required=True);p.add_argument('--title',required=True);p.add_argument('--duration',type=float,required=True,help='Audio duration in seconds');p.add_argument('--file',type=Path,required=True);args=p.parse_args()
if not re.fullmatch('[a-z0-9-]+',args.book) or args.chapter<1 or args.duration<=0:p.error('Use a lowercase hyphenated book ID, positive chapter number and duration.')
if args.file.suffix.lower()!='.mp3' or not args.file.is_file():p.error('Choose an existing MP3 file.')
path=root/'catalog.json';data=json.loads(path.read_text(encoding='utf-8-sig'));book=next((b for b in data['books'] if b['id']==args.book),None)
if not book:
 if not args.book_title:p.error('--book-title is required for a new book.')
 book={'id':args.book,'title':args.book_title,'narrator':args.narrator,'cover':'assets/icon-512.png','ongoing':True,'chapters':[]};data['books'].append(book)
if any(c['number']==args.chapter for c in book['chapters']):p.error('This chapter number already exists; refusing to overwrite.')
relative=f'audio/{args.book}/chapter-{args.chapter:02}.mp3';dest=root/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(args.file,dest)
book['chapters'].append({'id':f'{args.book}-{args.chapter:02}','number':args.chapter,'title':args.title,'src':relative,'duration':args.duration});book['chapters'].sort(key=lambda c:c['number']);path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print('Added',relative,'— commit and push to publish.')
