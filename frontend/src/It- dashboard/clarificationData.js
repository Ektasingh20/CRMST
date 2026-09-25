export const CLARIFICATION_STATUSES = ['Needs Clarification', 'Waiting for Reply', 'Answered', 'Closed'];
export const CLARIFICATION_PEOPLE = ['Ekta Singh', 'Rahul Sharma', 'Priya Mehta', 'Aman Verma'];
export const CLARIFICATION_PRIORITIES = ['High', 'Medium', 'Low'];
export const EMPTY_FILTERS = {search:'',status:'',priority:'',project:'',assignedTo:'',date:''};
export function createClarifications() {
  const records = [
    ['Confirm escalation permissions','Customer Support Workspace','High','Which roles can escalate a support ticket? Should team members be able to escalate directly, or should a team lead approve first?'],
    ['Confirm weekly reporting period','Learning Analytics Dashboard','Medium','Should weekly course reports start on Monday or Sunday? Please confirm the reporting timezone too.'],
    ['Client document access rules','System Technologies Client Portal','High','Can clients download all project documents, or only files explicitly shared with their account?'],
    ['Attendance rounding policy','Attendance Reporting Refresh','Medium','Should monthly attendance summaries round working hours to the nearest minute or display exact timestamps?'],
    ['Required fields for emergency contacts','Employee Profile Documents','Low','Is an alternate phone number required for an emergency contact, or should it remain optional?'],
    ['Quote request notification recipients','monu crane service','High','Who should receive a new quote request notification? Please confirm whether the operations team needs a copy.'],
    ['Archived course visibility','Learning Analytics Dashboard','Medium','Should archived courses remain visible in historical reports? Please confirm if they should be excluded from current totals.'],
    ['Ticket attachment formats','Customer Support Workspace','Low','Which attachment formats should support tickets accept? Is a 5 MB limit per file sufficient?'],
  ];
  return records.map(([subject,project,priority,question],i)=>{
    const date=new Date();date.setDate(date.getDate()-i);date.setHours(9,15,0,0);
    const at=date.toISOString();const status=CLARIFICATION_STATUSES[i%4];const askedBy='Ekta Singh';const assignedTo=CLARIFICATION_PEOPLE[1+i%3];
    const replies=i%4>=2?[{id:`reply-${i}`,author:assignedTo,text:i===2?'Only documents explicitly shared with the client account should be downloadable.':i===3?'Round totals to the nearest minute. Keep exact timestamps in the detailed report.':i===6?'Keep archived courses in historical reports and exclude them from current totals.':'Accept PDF, PNG and JPG files, with a 5 MB limit per file.',at:new Date(date.getTime()+3600000).toISOString()}]:[];
    const activity=[{id:`created-${i}`,text:`${askedBy} asked for clarification.`,at}];
    if(i%4>=1) activity.push({id:`waiting-${i}`,text:`Sent to ${assignedTo}; waiting for reply.`,at:new Date(date.getTime()+600000).toISOString()});
    if(replies.length) activity.push({id:`answered-${i}`,text:`${askedBy} marked the clarification as answered.`,at:new Date(date.getTime()+7200000).toISOString()});
    if(i%4===3) activity.push({id:`closed-${i}`,text:`${askedBy} closed the clarification.`,at:new Date(date.getTime()+10800000).toISOString()});
    return {id:`CLR-${String(108-i)}`,subject,project,priority,question,status,askedBy,assignedTo,at,replies,activity,attachments:i===0?[{id:'sample-note',name:'escalation-context.txt',url:`data:text/plain;charset=utf-8,${encodeURIComponent('Sample context: ticket escalation is available to team leads. Confirm whether other team members should have access.')}`,author:askedBy,at}]:[]};
  });
}
export function filterClarifications(items,filters) {
  const q=filters.search.trim().toLowerCase();
  return items.filter(item=>(!q||[item.id,item.subject,item.project,item.askedBy,item.assignedTo].some(value=>value.toLowerCase().includes(q)))&&
    (!filters.status||item.status===filters.status)&&(!filters.priority||item.priority===filters.priority)&&(!filters.project||item.project===filters.project)&&(!filters.assignedTo||item.assignedTo===filters.assignedTo)&&
    (!filters.date||localDate(item.at)===filters.date));
}
export function localDate(value) {const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function updateClarification(item,action,person,at=new Date().toISOString()) {
  if(item.status==='Closed') throw new Error('This clarification is closed.');
  let changes={};let text='';
  if(action.type==='reply') {
    if(!action.text?.trim()) throw new Error('Enter a reply before posting.');
    changes={replies:[...item.replies,{id:action.id,author:person,text:action.text.trim(),at}],status:item.status==='Needs Clarification'?'Waiting for Reply':item.status};
    text=`${person} added a reply.${item.status==='Needs Clarification'?' Status changed to Waiting for Reply.':''}`;
  } else if(action.type==='attach') {
    if(!action.files?.length) throw new Error('Choose an attachment.');
    changes={attachments:[...item.attachments,...action.files.map(file=>({...file,author:person,at}))]};text=`${person} added ${action.files.length} attachment(s).`;
  } else {
    const transitions={send:['Needs Clarification','Waiting for Reply'],answer:['Waiting for Reply','Answered'],close:['Answered','Closed']};
    const transition=transitions[action.type];
    if(!transition||item.status!==transition[0]) throw new Error('Follow the clarification status flow.');
    if(action.type==='answer'&&!item.replies.length) throw new Error('Add a reply before marking this clarification as answered.');
    changes={status:transition[1]};text=`${person} changed status to ${transition[1]}.`;
  }
  return {...item,...changes,activity:[...item.activity,{id:action.id,text,at}]};
}
