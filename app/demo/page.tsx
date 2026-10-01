import {redirect} from "next/navigation";
export const metadata={title:"School Control",robots:{index:false,follow:false}};
export default function Page(){redirect("/app");}
