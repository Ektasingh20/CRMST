// One square artwork is used for the preview, PNG sharing, printing and PDF.
export function certificateImage({ name, studentId, batch, title, id, date }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1200;
  const c = canvas.getContext("2d");
  c.fillStyle = "#fffefa";
  c.fillRect(0, 0, 1200, 1200);
  c.strokeStyle = "#caa27b";
  c.lineWidth = 3;
  c.strokeRect(4, 4, 1192, 1192);
  c.lineWidth = 2;
  c.strokeRect(22, 22, 1156, 1156);
  for (const [x, y, dx, dy] of [[32,32,1,1],[1168,32,-1,1],[32,1168,1,-1],[1168,1168,-1,-1]]) {
    c.beginPath(); c.moveTo(x + dx * 34, y); c.lineTo(x,y); c.lineTo(x,y + dy * 34); c.stroke();
  }
  const text = (value, x, y, size, color = "#272019", font = "Arial", align = "center", max = 1010) => {
    c.textAlign = align; c.fillStyle = color; c.font = `${size}px ${font}`;
    while (c.measureText(String(value)).width > max && size > 12) c.font = `${--size}px ${font}`;
    c.fillText(String(value), x, y);
  };
  text("SYSTEM TECHNOLOGIES · AJMER",600,125,22,"#9a5e30");
  text("Certificate of Completion",600,225,64,"#241c15","Georgia");
  text("THIS CREDENTIAL IS PROUDLY CONFERRED TO",600,282,19,"#8a8178");
  text(name,600,390,72,"#794820","Georgia");
  text(`Student ID: ${studentId} · Batch ${batch || "—"}`,600,443,23,"#716b66");
  text("For successfully completing the academic curriculum, practical laboratory standards,",600,530,21,"#716b66");
  text("and comprehensive assessments in:",600,563,21,"#716b66");
  c.fillStyle = "#f3eee7"; c.fillRect(180,605,840,90);
  text(title,600,660,30,"#241c15","Arial", "center",800);
  c.strokeStyle = "#e7ded3"; c.beginPath(); c.moveTo(85,770); c.lineTo(1115,770); c.stroke();
  text("ISSUE DATE",90,920,20,"#7c858c","Arial","left",340);
  text(date,90,957,25,"#171717","Arial","left",340);
  text(`ID: ${id}`,90,991,17,"#7c858c","Arial","left",340);
  const gold = c.createLinearGradient(540,890,665,1020); gold.addColorStop(0,"#cda64a"); gold.addColorStop(1,"#916344");
  c.fillStyle = gold; c.beginPath(); c.arc(600,953,66,0,Math.PI*2); c.fill();
  c.strokeStyle = "#f6e2b0"; c.setLineDash([2,3]); c.beginPath(); c.arc(600,953,61,0,Math.PI*2); c.stroke(); c.setLineDash([]);
  c.strokeStyle = "#fff"; c.lineWidth = 2.5; c.beginPath(); c.arc(600,936,12,0,Math.PI*2); c.stroke();
  c.beginPath(); c.moveTo(592,946); c.lineTo(589,965); c.lineTo(600,959); c.lineTo(611,965); c.lineTo(608,946); c.stroke();
  text("OFFICIAL SEAL",600,985,13,"#fff");
  text("Ganesh",950,925,66,"#171717","'Brush Script MT', cursive","center",320);
  c.strokeStyle = "#bbb"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(790,956); c.lineTo(1110,956); c.stroke();
  text("DIRECTOR OF ACADEMICS",950,993,18,"#6e7882","Arial","center",330);
  text("System Tech Ajmer",950,1026,18,"#8a929a");
  return canvas.toDataURL("image/png");
}
