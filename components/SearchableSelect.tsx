"use client";
import {Children,isValidElement,useState,type ReactNode,type SelectHTMLAttributes,type ChangeEvent} from "react";
import SmartSelect,{type SmartOption} from "@/components/SmartSelect";
function contentText(node:ReactNode):string{return Children.toArray(node).map(x=>typeof x==='string'||typeof x==='number'?String(x):isValidElement<{children?:ReactNode}>(x)?contentText(x.props.children):'').join('')}
function optionsFrom(node:ReactNode):SmartOption[]{const out:SmartOption[]=[];Children.forEach(node,child=>{if(!isValidElement<{children?:ReactNode;value?:string|number;disabled?:boolean}>(child))return;if(child.type==='option'){if(!child.props.disabled)out.push({value:String(child.props.value??contentText(child.props.children)),label:contentText(child.props.children)})}else out.push(...optionsFrom(child.props.children))});return out}
export default function SearchableSelect({label,allowCustom=false,customLabel,children,value,defaultValue,onChange,disabled,className,id,...props}:SelectHTMLAttributes<HTMLSelectElement>&{label:string;allowCustom?:boolean;customLabel?:string}){
 const [local,setLocal]=useState(String(defaultValue??''));const options=optionsFrom(children);const selected=value===undefined?local:String(value);
 return <div className={'searchable-select '+(className||'')} id={id}><SmartSelect label={props['aria-label']||label} value={selected} options={options} disabled={disabled} allowCustom={allowCustom} customLabel={customLabel} onChange={next=>{setLocal(next);onChange?.({target:{value:next},currentTarget:{value:next}} as ChangeEvent<HTMLSelectElement>)}}/></div>;
}
