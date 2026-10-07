"use client";
import {Children,isValidElement,useState,type ReactNode,type SelectHTMLAttributes,type ChangeEvent} from "react";
import SmartSelect,{type SmartOption} from "@/components/SmartSelect";
function contentText(node:ReactNode):string{return Children.toArray(node).map(x=>typeof x==='string'||typeof x==='number'?String(x):isValidElement<{children?:ReactNode}>(x)?contentText(x.props.children):'').join('')}
const fixedValues=new Set(["active","inactive","archived","deleted","draft","pending","approved","rejected","completed","cancelled","canceled","present","absent","late","sick","permission","excused","hadir","izin","sakit","alpa","alpha","L","P","owner","admin","teacher","staff","student","principal","vice_principal","subject","homeroom","combined","true","false","yes","no"]);
function naturallyEditable(options:SmartOption[]){
 const actual=options.filter(x=>x.value.trim());
 return actual.length>0 && actual.every(x=>!fixedValues.has(x.value) && x.value.trim().toLocaleLowerCase("id-ID")===x.label.trim().toLocaleLowerCase("id-ID"));
}
function optionsFrom(node:ReactNode):SmartOption[]{const out:SmartOption[]=[];Children.forEach(node,child=>{if(!isValidElement<{children?:ReactNode;value?:string|number;disabled?:boolean}>(child))return;if(child.type==='option'){if(!child.props.disabled)out.push({value:String(child.props.value??contentText(child.props.children)),label:contentText(child.props.children)})}else out.push(...optionsFrom(child.props.children))});return out}
export default function SearchableSelect({label,allowCustom,customLabel,children,value,defaultValue,onChange,disabled,className,id,...props}:SelectHTMLAttributes<HTMLSelectElement>&{label:string;allowCustom?:boolean;customLabel?:string}){
 const [local,setLocal]=useState(String(defaultValue??''));const options=optionsFrom(children);const selected=value===undefined?local:String(value);const canWrite=allowCustom??naturallyEditable(options);
 return <div className={'searchable-select '+(className||'')} id={id}><SmartSelect label={props['aria-label']||label} value={selected} options={options} disabled={disabled} allowCustom={canWrite} customLabel={customLabel||"Gunakan pilihan buatan sendiri"} onChange={next=>{setLocal(next);onChange?.({target:{value:next},currentTarget:{value:next}} as ChangeEvent<HTMLSelectElement>)}}/></div>;
}
