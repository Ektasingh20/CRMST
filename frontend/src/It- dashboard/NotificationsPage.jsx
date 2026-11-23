import { BellRing, CheckCheck } from "lucide-react";
import { formatITDate, notificationId } from "./workPageModel.js";

export default function NotificationsPage({ notifications, unreadCount, onOpen, onMarkAllRead }) {
  return (
    <section className="it-work-card it-notifications-page">
      <div className="it-notifications-heading">
        <div><h2>Notifications</h2><p>HR helpdesk messages, assigned projects, and tasks</p></div>
        <div className="it-notifications-actions">
          <span className="it-notifications-unread">{unreadCount} unread</span>
          <button type="button" className="it-work-secondary-button" onClick={onMarkAllRead} disabled={!unreadCount}><CheckCheck size={15} /> Mark all read</button>
        </div>
      </div>
      <div className="it-notifications-list">
        {notifications.map((item) => {
          const id = notificationId(item);
          const message = item.message || item.title || "Work update";
          return <button type="button" className={`it-notification-row${item.read ? "" : " unread"}`} key={id} onClick={() => onOpen(item)}>
            <span className="it-notification-dot" aria-hidden="true" />
            <span className="it-notification-copy"><strong>{message}</strong><small>{formatITDate(item.createdAt || item.timestamp || item.at)}</small></span>
            {!item.read && <span className="it-notification-status">Unread</span>}
          </button>;
        })}
        {!notifications.length && <div className="it-notifications-empty"><span><BellRing size={23} /></span><strong>All caught up</strong><p>New work updates will appear here.</p></div>}
      </div>
    </section>
  );
}
