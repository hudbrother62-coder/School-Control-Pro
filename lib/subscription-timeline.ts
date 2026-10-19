export type SubscriptionTimelineInput={subscription_status?:string;status?:string;trial_ends_at:string|null;current_period_end:string|null;is_lifetime?:boolean;updated_at?:string|null};
const day=86400000;
export function subscriptionTimeline(s:SubscriptionTimelineInput,now=Date.now()){
 const status=s.subscription_status||s.status||'none';
 const isLifetime=status==='active'&&s.is_lifetime===true;
 const trial=s.trial_ends_at?Date.parse(s.trial_ends_at):NaN,paid=s.current_period_end?Date.parse(s.current_period_end):NaN;
 const deadline=isLifetime?NaN:status==='trial'?trial:status==='active'?paid:Number.isFinite(paid)?paid:trial;
 const blocked=!['trial','active'].includes(status);
 const active=!blocked&&(isLifetime||(Number.isFinite(deadline)&&deadline>now));
 const inactiveSince=!active?(blocked&&s.updated_at?Date.parse(s.updated_at):deadline):NaN;
 return {active,isLifetime,status:active?status:'inactive',deadline:Number.isFinite(deadline)?new Date(deadline).toISOString():null,
 trialDays:status==='trial'&&Number.isFinite(trial)?Math.max(0,Math.ceil((trial-now)/day)):null,
 dueDays:isLifetime?Number.POSITIVE_INFINITY:active?Math.max(0,Math.ceil((deadline-now)/day)):0,
 hoursLeft:isLifetime?Number.POSITIVE_INFINITY:active?Math.max(0,Math.ceil((deadline-now)/3600000)):0,
 inactiveDays:!active&&Number.isFinite(inactiveSince)?Math.max(0,Math.floor((now-inactiveSince)/day)):null,
 inactiveSince:!active&&Number.isFinite(inactiveSince)?new Date(inactiveSince).toISOString():null};
}
