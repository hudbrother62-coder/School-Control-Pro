"use client";
import {Fragment,type ReactNode} from "react";
const fence=String.fromCharCode(96).repeat(3);
function inline(value:string):ReactNode[]{
 return value.split(/(\*\*[^*]+\*\*|\\\([^)]*\\\))/g).map((part,i)=>
  part.startsWith("**")&&part.endsWith("**")?<strong key={i}>{part.slice(2,-2)}</strong>:
  part.startsWith("\\(")&&part.endsWith("\\)")?<code className="ai-inline-math" key={i}>{part}</code>:
  <Fragment key={i}>{part}</Fragment>);
}
export default function AiDocumentPreview({content}:{content:string}){
 const lines=content.replace(/\r\n/g,"\n").split("\n"),blocks:ReactNode[]=[];let i=0;
 const cells=(row:string)=>row.trim().replace(/^\||\|$/g,"").split("|").map(x=>x.trim());
 while(i<lines.length){
  const line=lines[i].trim(),key=i;if(!line){i++;continue}
  if(line.startsWith(fence)){
   const language=line.slice(fence.length).trim()||"teks",code:string[]=[];i++;
   while(i<lines.length&&!lines[i].trim().startsWith(fence))code.push(lines[i++]);if(i<lines.length)i++;
   blocks.push(<pre className="ai-code-block" key={key}><code aria-label={"Kode "+language}>{code.join("\n")}</code></pre>);continue;
  }
  if(line==="\\["||line==="$$"){
   const end=line==="$$"?"$$":"\\]",equation:string[]=[];i++;
   while(i<lines.length&&lines[i].trim()!==end)equation.push(lines[i++]);if(i<lines.length)i++;
   blocks.push(<pre className="ai-formula-block" key={key}>{equation.join("\n")}</pre>);continue;
  }
  const heading=/^(#{1,4})\s+(.+)$/.exec(line);
  if(heading){const text=inline(heading[2]);blocks.push(heading[1].length<3?<h3 key={key}>{text}</h3>:<h4 key={key}>{text}</h4>);i++;continue}
  if(line.startsWith("|")&&i+1<lines.length&&/^\|?[\s:|-]+\|?$/.test(lines[i+1].trim())){
   const columns=cells(line),rows:string[][]=[];i+=2;
   while(i<lines.length&&lines[i].trim().startsWith("|"))rows.push(cells(lines[i++]));
   blocks.push(<div className="ai-document-table" key={key}><table><thead><tr>{columns.map((c,j)=><th key={j}>{inline(c)}</th>)}</tr></thead><tbody>{rows.map((r,j)=><tr key={j}>{r.map((c,k)=><td key={k}>{inline(c)}</td>)}</tr>)}</tbody></table></div>);continue;
  }
  const isList=(x:string)=>/^(?:[-*]\s+|\d+[.)]\s+)/.test(x);
  if(isList(line)){
   const ordered=/^\d+[.)]\s+/.test(line),items:string[]=[];
   while(i<lines.length&&isList(lines[i].trim()))items.push(lines[i++].trim().replace(/^(?:[-*]|\d+[.)])\s+/,""));
   const list=items.map((v,j)=><li key={j}>{inline(v)}</li>);blocks.push(ordered?<ol key={key}>{list}</ol>:<ul key={key}>{list}</ul>);continue;
  }
  const paragraph:string[]=[];
  while(i<lines.length&&lines[i].trim()&&!lines[i].trim().startsWith("#")&&!lines[i].trim().startsWith(fence)&&!isList(lines[i].trim())&&lines[i].trim()!=="\\["&&lines[i].trim()!=="$$")paragraph.push(lines[i++].trim());
  if(!paragraph.length){i++;continue}
  blocks.push(<p key={key}>{inline(paragraph.join(" "))}</p>);
 }
 return <article className="ai-document-preview">{blocks}</article>;
}
