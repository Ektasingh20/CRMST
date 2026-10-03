import { useEffect, useMemo, useState } from "react";
import { fetchMessageTemplates } from "./backendApi.js";

let pending = null;

function loadTemplates() {
  if (!pending) pending = fetchMessageTemplates().then((templates) => Array.isArray(templates) ? templates : [])
    .finally(() => { pending = null; });
  return pending;
}

export function useMessageTemplates(type = "") {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedTemplates = useMemo(
    () => type ? templates.filter((template) => template.type === type) : templates,
    [templates, type],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadTemplates().then((rows) => { if (active) { setTemplates(rows); setError(""); } })
      .catch((failure) => { if (active) setError(failure.message || "Could not load message templates."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { templates: selectedTemplates, loading, error };
}
