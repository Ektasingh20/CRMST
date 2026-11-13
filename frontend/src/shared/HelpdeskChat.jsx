import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BellRing, MessageCircle, Plus, Search, X } from "lucide-react";
import { createHelpdeskConversation, fetchHelpdeskConversations, fetchHelpdeskMessages, fetchUsers, sendHelpdeskMessage } from "../../backendApi.js";
import "./helpdeskChat.css";

const isHrUser = (user) => /admin|hr|human resource/i.test(`${user?.role || ""} ${user?.dept || user?.department || ""}`);
const personName = (user, fallback = "Employee") => String(user?.name || user?.username || fallback);
const personId = (user) => String(user?.id || user?._id || "");
const formatTime = (value) => value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
const OPEN_CONVERSATION_KEY = "hr-helpdesk-open-conversation";

export function HelpdeskIncomingToast({ user, onOpen }) {
  const [notice, setNotice] = useState(null);
  const meId = personId(user);
  const baseline = useRef(false);
  const lastMessages = useRef(new Map());

  useEffect(() => {
    if (!meId) return undefined;
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const rows = await fetchHelpdeskConversations();
        if (!active || !Array.isArray(rows)) return;
        const previous = lastMessages.current;
        if (baseline.current) {
          const incoming = rows.filter((row) => row.lastMessageAt && row.lastSenderId !== meId
            && previous.get(row.id) !== row.lastMessageAt)
            .sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)))[0];
          if (incoming) setNotice({ id: `${incoming.id}:${incoming.lastMessageAt}`, conversationId: incoming.id, sender: incoming.lastSenderName || incoming.employeeName || "New message", subject: incoming.subject, text: incoming.lastMessage || "You received a message." });
        }
        lastMessages.current = new Map(rows.map((row) => [row.id, row.lastMessageAt]));
        baseline.current = true;
      } catch { /* Keep the dashboard usable while the helpdesk is offline. */ }
      finally { pending = false; }
    };
    refresh();
    const timer = window.setInterval(refresh, 3000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [meId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;
  const open = () => {
    try { window.sessionStorage.setItem(OPEN_CONVERSATION_KEY, notice.conversationId); } catch { /* Ignore unavailable session storage. */ }
    window.dispatchEvent(new CustomEvent("hr-helpdesk-open-conversation", { detail: { id: notice.conversationId } }));
    setNotice(null);
    onOpen?.();
  };
  return <aside className="eh-incoming-toast" role="status" aria-live="polite">
    <button className="eh-toast-open" type="button" onClick={open}>
      <span className="eh-toast-icon"><BellRing size={17} /></span>
      <span className="eh-toast-copy"><strong>{notice.sender} sent you a message</strong><small>{notice.subject}</small><span>{notice.text}</span></span>
    </button>
    <button className="eh-toast-close" type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={15} /></button>
    <i key={notice.id} className="eh-toast-progress" />
  </aside>;
}

export default function HelpdeskChat({ user, displayName }) {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [newConversation, setNewConversation] = useState(false);
  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [employees, setEmployees] = useState([]);
  const [recipientId, setRecipientId] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messageEndRef = useRef(null);

  const meId = personId(user);
  const meName = displayName || personName(user);
  const hr = isHrUser(user);
  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((conversation) => !query || `${conversation.subject} ${conversation.employeeName} ${conversation.lastMessage}`.toLowerCase().includes(query));
  }, [conversations, search]);
  const selected = visibleConversations.find((conversation) => conversation.id === selectedId) || visibleConversations[0] || null;

  useEffect(() => {
    if (!hr) return undefined;
    let active = true;
    fetchUsers().then((users) => {
      if (!active || !Array.isArray(users)) return;
      setEmployees(users.filter((employee) => {
        const dept = String(employee.dept || employee.department || "").trim().toLowerCase();
        const role = String(employee.role || "").trim().toLowerCase();
        const status = String(employee.status || "active").trim().toLowerCase();
        return employee.id && !["inactive", "disabled", "former"].includes(status)
          && (["crm", "it"].includes(dept) || role.includes("crm executive") || role === "it");
      }));
    }).catch((requestError) => { if (active) setError(requestError.message || "Unable to load employees."); });
    return () => { active = false; };
  }, [hr]);

  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const rows = await fetchHelpdeskConversations();
        if (!active || !Array.isArray(rows)) return;
        setConversations(rows);
        setSelectedId((current) => current && rows.some((item) => item.id === current) ? current : (rows[0]?.id || ""));
        setError("");
      } catch (requestError) {
        if (active) setError(requestError.message || "Could not load HR Helpdesk.");
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 7000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [meId]);

  useEffect(() => {
    if (!selected?.id || newConversation) { setMessages([]); return undefined; }
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const rows = await fetchHelpdeskMessages(selected.id);
        if (active && Array.isArray(rows)) setMessages(rows);
      } catch (requestError) {
        if (active) setError(requestError.message || "Could not load conversation messages.");
      } finally { pending = false; }
    };
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selected?.id, newConversation]);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages, selected?.id]);

  useEffect(() => {
    const openConversation = (id) => {
      if (!id) return;
      setSelectedId(id);
      setNewConversation(false);
      setDraft("");
    };
    try {
      const fromStorage = window.sessionStorage.getItem(OPEN_CONVERSATION_KEY);
      if (fromStorage) {
        openConversation(fromStorage);
        window.sessionStorage.removeItem(OPEN_CONVERSATION_KEY);
      }
    } catch { /* Ignore unavailable session storage. */ }
    const handleOpen = (event) => openConversation(event.detail?.id);
    window.addEventListener("hr-helpdesk-open-conversation", handleOpen);
    return () => window.removeEventListener("hr-helpdesk-open-conversation", handleOpen);
  }, []);

  const startConversation = async (event) => {
    event.preventDefault();
    if (!subject.trim() || !firstMessage.trim() || (hr && !recipientId) || sending) return;
    setSending(true); setError("");
    try {
      const result = await createHelpdeskConversation(subject.trim(), firstMessage.trim(), hr ? recipientId : "");
      setConversations((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      setMessages(result.messages || []);
      setSelectedId(result.id); setNewConversation(false); setSubject(""); setFirstMessage(""); setRecipientId("");
    } catch (requestError) {
      setError(requestError.message || "Could not start a conversation.");
    } finally { setSending(false); }
  };

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!selected || !text || sending) return;
    setSending(true); setError("");
    try {
      const item = await sendHelpdeskMessage(selected.id, text);
      setMessages((current) => [...current, item]);
      setConversations((current) => current.map((row) => row.id === selected.id ? {
        ...row, lastMessage: item.text, lastMessageAt: item.createdAt, lastSenderId: item.senderId,
        lastSenderName: item.senderName, updatedAt: item.createdAt,
      } : row).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))));
      setDraft("");
    } catch (requestError) {
      setError(requestError.message || "Could not send this message.");
    } finally { setSending(false); }
  };

  return <main className="eh-helpdesk">
    <header className="eh-page-heading"><span><MessageCircle size={19} /></span><div><small>HR SUPPORT</small><h2>Employee Helpdesk</h2><p>{hr ? "View and reply to conversations from CRM and IT employees." : "Chat directly with HR. Your messages are shared with the HR team."}</p></div></header>
    {error && <p className="eh-error" role="alert">{error}</p>}
    <section className="eh-chat-app">
      <aside className="eh-inbox">
        <div className="eh-inbox-heading"><div><h3>Chats</h3><small>{visibleConversations.length} conversations</small></div><button type="button" onClick={() => { setNewConversation(true); setSubject(""); setFirstMessage(""); setRecipientId(""); setError(""); }}><Plus size={15} /> New chat</button></div>
        <label className="eh-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chats" aria-label="Search chats" /></label>
        <div className="eh-conversation-list">
          {visibleConversations.map((conversation) => <button type="button" key={conversation.id} className={`eh-conversation${selected?.id === conversation.id && !newConversation ? " is-active" : ""}`} onClick={() => { setSelectedId(conversation.id); setNewConversation(false); setDraft(""); }}>
            <span className="eh-avatar">{(hr ? conversation.employeeName : "HR").slice(0, 1).toUpperCase()}</span>
            <span className="eh-conversation-copy"><strong>{hr ? conversation.employeeName : conversation.subject}</strong><small>{hr ? `${conversation.subject} · ` : `${conversation.lastSenderId === meId ? "You: " : ""}`}{conversation.lastMessage || "Start a conversation"}</small></span>
            <time>{formatTime(conversation.lastMessageAt || conversation.createdAt)}</time>
          </button>)}
          {!loading && !visibleConversations.length && <div className="eh-empty-inbox"><MessageCircle size={20} /><p>{hr ? "No employee chats yet." : "No chats yet. Start a new conversation with HR."}</p></div>}
          {loading && <p className="eh-loading">Loading chats…</p>}
        </div>
      </aside>

      <section className="eh-thread">
        {newConversation ? <div className="eh-compose-new"><span className="eh-empty-icon"><MessageCircle size={22} /></span><h3>{hr ? "Message an employee" : "New chat with HR"}</h3><p>{hr ? "Choose a CRM or IT employee and start a direct conversation." : "Start a conversation and HR will reply here."}</p><form onSubmit={startConversation}>{hr && <label>Employee<select required value={recipientId} onChange={(event) => setRecipientId(event.target.value)}><option value="">Choose a CRM or IT employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name || employee.username} · {employee.dept || employee.department || employee.role}</option>)}</select></label>}<label>Subject<input autoFocus={!hr} maxLength={160} required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What do you need help with?" /></label><label>Message<textarea rows="4" maxLength={5000} required value={firstMessage} onChange={(event) => setFirstMessage(event.target.value)} placeholder="Write your message…" /></label><button type="submit" disabled={sending || (hr && !recipientId) || !subject.trim() || !firstMessage.trim()}>{sending ? "Sending…" : "Start chat"}</button></form></div>
          : selected ? <>
            <header className="eh-thread-header"><span className="eh-avatar">{(hr ? selected.employeeName : "HR").slice(0, 1).toUpperCase()}</span><div><strong>{hr ? selected.employeeName : "HR Support"}</strong><small>{hr ? `${selected.department || "Employee"} · ` : ""}{selected.subject}</small></div><span className="eh-online-dot" /> <small>Helpdesk</small></header>
            <div className="eh-messages" aria-live="polite">{messages.map((item, index) => {
              const mine = item.senderId === meId;
              return <div key={item.id || `${item.createdAt}-${index}`} className={`eh-message-row${mine ? " is-mine" : ""}`}><article className="eh-bubble"><small>{item.senderName} · {formatTime(item.createdAt)}</small><p>{item.text}</p></article></div>;
            })}{!messages.length && <p className="eh-loading">Loading messages…</p>}<div ref={messageEndRef} /></div>
            <form className="eh-message-composer" onSubmit={send}><textarea rows="2" maxLength={5000} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} placeholder="Write a reply…" aria-label="Write a reply" /><button type="submit" disabled={sending || !draft.trim()} aria-label="Send reply" title="Send reply"><ArrowRight size={17} /><span>Reply</span></button><small>Press Enter to send · Shift+Enter for a new line</small></form>
          </> : <div className="eh-no-selection"><span className="eh-empty-icon"><MessageCircle size={22} /></span><h3>{hr ? "Employee helpdesk" : "Your HR chats"}</h3><p>{hr ? "Select a conversation or start a chat with an employee." : "Select a conversation or start a new chat."}</p><button type="button" onClick={() => { setNewConversation(true); setRecipientId(""); }}><Plus size={15} /> New chat</button></div>}
      </section>
    </section>
  </main>;
}
