/**
 * Discount Spinner Widget — Storefront JavaScript
 * Premium UI Redesign (Vibrant Gradients, Golden Rim Pegs, Glowing Canvas Center)
 * Local DB lead capture & Auto Add-to-Cart with Cart Redirect
 *
 * Security: Render all user data safely using textContent.
 */

(function () {
  "use strict";

  // ========== CONFIG (injected by Liquid) ==========
  const WIDGET_CONFIG = window.__DS_CONFIG__ || {};
  const APP_URL = WIDGET_CONFIG.appUrl || "";
  const SHOP = WIDGET_CONFIG.shop || "";
  const PRIMARY = WIDGET_CONFIG.primaryColor || "#7c3aed";
  const ACCENT = WIDGET_CONFIG.accentColor || "#f59e0b";

  // ========== STATE ==========
  let spinnerConfig = null;
  let wonDiscount = null;
  let wonProduct = null;
  let timerInterval = null;
  let offerExpired = false;

  // ========== UTILITY: Weighted random ==========
  function weightedRandom(segments) {
    const total = segments.reduce((sum, s) => sum + Number(s.probability), 0);
    let rand = Math.random() * (total || 100);
    for (const seg of segments) {
      rand -= Number(seg.probability);
      if (rand <= 0) return seg;
    }
    return segments[0];
  }

  // ========== UTILITY: Hex to CSS ==========
  function hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(124,58,237,${alpha})`;
    return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
  }

  // ========== UTILITY: Safe text setter ==========
  function setText(el, text) {
    if (el) el.textContent = String(text);
  }

  // ========== INJECT STYLES (PREMIUM REDESIGN) ==========
  function injectStyles() {
    if (document.getElementById("ds-widget-styles")) return;
    const style = document.createElement("style");
    style.id = "ds-widget-styles";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');

      :root {
        --ds-primary: ${PRIMARY};
        --ds-accent: ${ACCENT};
        --ds-bg: rgba(10, 10, 24, 0.95);
        --ds-surface: rgba(255, 255, 255, 0.05);
        --ds-border: rgba(255, 255, 255, 0.12);
        --ds-glow-primary: ${hexToRgba(PRIMARY, 0.6)};
        --ds-glow-accent: ${hexToRgba(ACCENT, 0.6)};
      }

      #ds-overlay {
        position: fixed;
        inset: 0;
        background: rgba(3, 3, 10, 0.8);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: dsFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      #ds-modal {
        background: var(--ds-bg);
        border: 1.5px solid var(--ds-border);
        border-radius: 24px;
        width: 92%;
        max-width: 460px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 50px var(--ds-glow-primary);
        animation: dsScaleUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        font-family: 'Outfit', sans-serif;
        color: #ffffff;
      }

      /* Progress Bar */
      .ds-progress-track {
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        overflow: hidden;
      }
      .ds-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--ds-primary), var(--ds-accent));
        width: 0%;
        transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 0 12px var(--ds-primary);
      }

      /* Header info */
      .ds-topbar {
        display: flex;
        justify-content: space-between;
        padding: 20px 55px 8px 26px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 1.8px;
        text-transform: uppercase;
      }
      .ds-step-label {
        color: var(--ds-accent);
        text-shadow: 0 0 10px var(--ds-glow-accent);
      }
      .ds-offer-label {
        color: rgba(255,255,255,0.45);
      }

      /* Close Button */
      .ds-close {
        position: absolute;
        top: 15px;
        right: 15px;
        width: 32px;
        height: 32px;
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 50%;
        background: rgba(255,255,255,0.04);
        color: rgba(255,255,255,0.75);
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 100;
      }
      .ds-close:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        transform: rotate(90deg);
        box-shadow: 0 0 12px rgba(255,255,255,0.25);
      }

      /* Screens Layout */
      .ds-screen {
        padding: 24px 28px 36px;
        display: none;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 22px;
      }
      .ds-screen.active {
        display: flex;
        animation: dsSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      /* Titles & Subtitles */
      .ds-title {
        font-size: 28px;
        font-weight: 900;
        background: linear-gradient(135deg, #ffffff 60%, rgba(255,255,255,0.7));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        line-height: 1.25;
        letter-spacing: -0.5px;
      }
      .ds-subtitle {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.65);
        line-height: 1.6;
        max-width: 340px;
      }

      /* Premium Redesigned Spin Buttons */
      .ds-btn-primary {
        width: 100%;
        padding: 16px 28px;
        border-radius: 50px;
        border: none;
        background: linear-gradient(135deg, var(--ds-primary), var(--ds-accent));
        color: #fff;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 8px 24px var(--ds-glow-primary);
        position: relative;
        overflow: hidden;
      }
      .ds-btn-primary::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }
      .ds-btn-primary:hover {
        transform: translateY(-3px);
        box-shadow: 0 14px 32px var(--ds-glow-primary), 0 0 20px var(--ds-glow-accent);
      }
      .ds-btn-primary:hover::after {
        transform: translateX(100%);
      }
      .ds-btn-primary:active {
        transform: translateY(1px);
      }
      .ds-btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }

      /* Wheel Container styling */
      .ds-wheel-wrap {
        position: relative;
        width: 290px;
        height: 290px;
        margin: 10px 0;
        filter: drop-shadow(0 15px 35px rgba(0, 0, 0, 0.6));
      }
      .ds-pointer {
        position: absolute;
        top: -14px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 15px solid transparent;
        border-right: 15px solid transparent;
        border-top: 26px solid var(--ds-accent);
        z-index: 100;
        filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5));
      }
      .ds-pointer::after {
        content: '';
        position: absolute;
        top: -26px;
        left: -4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 0 10px var(--ds-accent);
      }
      .ds-center-glow {
        position: absolute;
        inset: 0;
        margin: auto;
        width: 48px;
        height: 48px;
        background: radial-gradient(circle, #ffffff 10%, var(--ds-accent) 50%, var(--ds-primary) 100%);
        border-radius: 50%;
        z-index: 5;
        border: 4px solid #0a0a18;
        box-shadow: 0 0 20px #fff, 0 0 35px var(--ds-primary);
      }
      .ds-spinning-label {
        font-size: 14px;
        font-weight: 900;
        color: var(--ds-accent);
        letter-spacing: 2.5px;
        text-transform: uppercase;
        animation: dsPulse 1.5s ease-in-out infinite;
      }

      /* Jackpot / Prize Card */
      .ds-jackpot-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1.5px solid rgba(255, 255, 255, 0.08);
        border-radius: 18px;
        padding: 22px;
        font-size: 24px;
        font-weight: 900;
        color: var(--ds-accent);
        text-shadow: 0 0 12px var(--ds-glow-accent);
        letter-spacing: 1px;
        width: 100%;
        box-shadow: inset 0 0 25px rgba(255, 255, 255, 0.02);
      }

      /* Final Rewards Box */
      .ds-rewards-box {
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: 100%;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 18px;
        padding: 18px;
      }
      .ds-reward-item {
        display: flex;
        align-items: center;
        gap: 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 14px;
        padding: 12px 18px;
        text-align: left;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .ds-reward-item:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(255, 255, 255, 0.15);
      }
      .ds-reward-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--ds-primary), var(--ds-accent));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        overflow: hidden;
      }
      .ds-reward-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ds-reward-details {
        display: flex;
        flex-direction: column;
      }
      .ds-reward-title {
        font-size: 15px;
        font-weight: 800;
        color: #ffffff;
      }
      .ds-reward-sub {
        font-size: 11px;
        color: var(--ds-accent);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-top: 3px;
      }

      /* Timer Badge */
      .ds-timer-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.55);
        font-weight: 700;
        text-transform: uppercase;
      }
      .ds-timer-badge {
        font-size: 18px;
        font-weight: 900;
        color: var(--ds-accent);
        font-variant-numeric: tabular-nums;
        padding: 4px 14px;
        border: 2.5px solid var(--ds-accent);
        border-radius: 10px;
        letter-spacing: 1px;
        animation: dsPulse 2s ease infinite;
        min-width: 90px;
        text-align: center;
        background: rgba(245, 158, 11, 0.06);
        text-shadow: 0 0 8px var(--ds-glow-accent);
      }

      /* Premium Inputs */
      .ds-email-wrap {
        width: 100%;
        position: relative;
      }
      .ds-email-input {
        width: 100% !important;
        padding: 16px 22px 16px 52px !important;
        border-radius: 50px !important;
        border: 2px solid rgba(255, 255, 255, 0.3) !important;
        background: #111124 !important;
        color: #ffffff !important;
        font-size: 15px !important;
        font-family: inherit !important;
        outline: none !important;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        box-sizing: border-box !important;
        height: auto !important;
      }
      .ds-email-input::placeholder {
        color: rgba(255, 255, 255, 0.55) !important;
        opacity: 1 !important;
      }
      .ds-email-input:focus {
        border-color: var(--ds-primary) !important;
        background: #161630 !important;
        box-shadow: 0 0 0 4px ${hexToRgba(PRIMARY, 0.35)} !important;
      }
      .ds-email-icon {
        position: absolute !important;
        left: 22px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        color: rgba(255, 255, 255, 0.55) !important;
        font-size: 18px !important;
        pointer-events: none !important;
        z-index: 2 !important;
      }

      /* Error Messages */
      .ds-error-msg {
        color: #ff6b6b;
        font-size: 12px;
        font-weight: 700;
        margin-top: -6px;
        height: 14px;
      }

      /* Privacy Notes */
      .ds-privacy-note {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.45);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      /* Animations */
      @keyframes dsFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes dsScaleUp {
        from { transform: scale(0.85); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes dsSlideIn {
        from { transform: translateY(15px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes dsPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(0.97); }
      }
      @keyframes dsOverlayOut {
        to { opacity: 0; }
      }

      /* Sticky Widget */
      #ds-sticky-widget {
        position: fixed;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        background: var(--ds-bg);
        border: 1.5px solid var(--ds-border);
        border-right: none;
        border-top-left-radius: 16px;
        border-bottom-left-radius: 16px;
        padding: 24px;
        z-index: 2147483646;
        text-align: center;
        font-family: 'Outfit', sans-serif;
        color: #ffffff;
        box-shadow: 0 10px 40px rgba(0,0,0,0.6), 0 0 30px var(--ds-glow-primary);
        display: none;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      .ds-sticky-title {
        font-size: 11px;
        font-weight: 900;
        margin-bottom: 12px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.7);
      }
      .ds-sticky-timer {
        font-size: 26px;
        font-weight: 900;
        color: var(--ds-primary);
        font-family: monospace;
        margin-bottom: 18px;
        text-shadow: 0 0 15px var(--ds-glow-primary);
      }
      .ds-sticky-btn {
        background: linear-gradient(135deg, var(--ds-primary), var(--ds-accent));
        color: #ffffff;
        border: none;
        padding: 12px 24px;
        font-size: 13px;
        font-weight: 900;
        border-radius: 50px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        width: 100%;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 6px 16px var(--ds-glow-primary);
      }
      .ds-sticky-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px var(--ds-glow-primary), 0 0 15px var(--ds-glow-accent);
      }
      .ds-sticky-btn:active {
        transform: translateY(1px);
      }
    `;
    document.head.appendChild(style);
  }

  // ========== BUILD WHEEL CANVAS (VIBRANT & ULTRA-PREMIUM) ==========
  function drawWheel(canvas, segments, rotationAngle) {
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 8;
    const n = segments.length;
    const arc = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, size, size);

    // Highly distinct, premium vibrant colors for slices
    const colors = [
      "#6d28d9", // Deep Purple
      "#db2777", // Rose / Pink
      "#059669", // Vibrant Emerald
      "#ea580c", // Electric Orange
      "#2563eb", // Royal Blue
      "#06b6d4", // Cyan
      "#b91c1c", // Crimson Red
      "#4f46e5"  // Indigo
    ];

    for (let i = 0; i < n; i++) {
      const start = rotationAngle + i * arc;
      const end = start + arc;

      // Draw wedge with beautiful radial gradient to give it a 3D glow look
      const grad = ctx.createRadialGradient(cx, cy, 15, cx, cy, radius);
      grad.addColorStop(0, "#0e0e1d");
      grad.addColorStop(1, colors[i % colors.length]);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Sleek separating lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Write Text Segment labels with multi-line wrapping & dynamic font scaling
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";

      let label = String(segments[i].label).toUpperCase();
      
      // Smart splitting: try splitting on dash or slash first, otherwise split in middle word
      let lines = [];
      if (label.length > 12) {
        let parts = label.split(/\s*[-/]\s*/);
        if (parts.length > 1 && parts[0].length < 18) {
          lines = parts;
        } else {
          let words = label.split(" ");
          let mid = Math.ceil(words.length / 2);
          let l1 = words.slice(0, mid).join(" ");
          let l2 = words.slice(mid).join(" ");
          if (l1 && l2) {
            lines = [l1, l2];
          } else {
            lines = [label];
          }
        }
      } else {
        lines = [label];
      }

      // Dynamic font size scaling based on length
      let maxLen = Math.max(...lines.map(l => l.length));
      let fontSize = 13;
      if (maxLen > 18) fontSize = 8.5;
      else if (maxLen > 14) fontSize = 10;
      else if (maxLen > 11) fontSize = 11.5;

      ctx.font = `900 ${fontSize}px 'Outfit', sans-serif`;
      
      // Clear text shadow/glow
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      if (lines.length === 2) {
        // Draw 2 lines offset vertically to prevent overlapping
        ctx.fillText(lines[0], radius - 26, -6);
        ctx.fillText(lines[1], radius - 26, 6);
      } else {
        ctx.fillText(lines[0], radius - 26, 0);
      }
      ctx.restore();
    }

    // Draw shining golden pegs on the wheel's rim
    for (let i = 0; i < n; i++) {
      const angle = rotationAngle + i * arc;
      const pegX = cx + (radius - 3) * Math.cos(angle);
      const pegY = cy + (radius - 3) * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(pegX, pegY, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = ACCENT;
      ctx.shadowBlur = 6;
      ctx.fill();
    }

    // Outer premium double glow rim
    const outerGrad = ctx.createRadialGradient(cx, cy, radius - 8, cx, cy, radius + 2);
    outerGrad.addColorStop(0, "transparent");
    outerGrad.addColorStop(1, hexToRgba(ACCENT, 0.55));
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = outerGrad;
    ctx.lineWidth = 8;
    ctx.stroke();

    // Center cap (metal peg with light reflection)
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
    ctx.fillStyle = ACCENT;
    ctx.fill();
  }

  // ========== SPIN ANIMATION ==========
  function spinWheel(canvas, segments, targetIndex, onComplete) {
    const arc = (2 * Math.PI) / segments.length;
    const targetAngle = -(targetIndex * arc + arc / 2) + Math.PI * 1.5;
    const extraSpins = 6 * 2 * Math.PI; // 6 spins
    const duration = 5000;
    const start = performance.now();

    function easeOutQuint(t) {
      return 1 - Math.pow(1 - t, 5);
    }

    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuint(progress);
      const currentAngle = eased * (extraSpins + targetAngle);
      drawWheel(canvas, segments, currentAngle);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        drawWheel(canvas, segments, currentAngle);
        onComplete();
      }
    }
    requestAnimationFrame(frame);
  }

  // ========== BUILD MODAL DOM ==========
  function buildModal() {
    const config = spinnerConfig;

    const overlay = document.createElement("div");
    overlay.id = "ds-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Discount Spinner Jackpot");

    const modal = document.createElement("div");
    modal.id = "ds-modal";

    // Progress Bar
    const progressTrack = document.createElement("div");
    progressTrack.className = "ds-progress-track";
    const progressFill = document.createElement("div");
    progressFill.className = "ds-progress-fill";
    progressFill.id = "ds-progress-fill";
    progressTrack.appendChild(progressFill);

    // Top Bar
    const topbar = document.createElement("div");
    topbar.className = "ds-topbar";
    const stepLabel = document.createElement("span");
    stepLabel.className = "ds-step-label";
    stepLabel.id = "ds-step-label";
    stepLabel.textContent = "0/2 REWARDS";
    const offerLabel = document.createElement("span");
    offerLabel.className = "ds-offer-label";
    offerLabel.textContent = "EXCLUSIVE OFFER";
    topbar.appendChild(stepLabel);
    topbar.appendChild(offerLabel);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "ds-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", closeWidget);

    const screens = buildScreens(config);

    modal.appendChild(progressTrack);
    modal.appendChild(topbar);
    modal.appendChild(closeBtn);
    for (const s of screens) {
      modal.appendChild(s);
    }
    overlay.appendChild(modal);

    return overlay;
  }

  function buildScreens(config) {
    // ===== SCREEN 1: Intro =====
    const s1 = document.createElement("div");
    s1.className = "ds-screen active";
    s1.id = "ds-screen-1";

    const s1Title = document.createElement("div");
    s1Title.className = "ds-title";
    setText(s1Title, config.popupTitle || "Get Your Exclusive Reward");

    const s1Sub = document.createElement("div");
    s1Sub.className = "ds-subtitle";
    setText(s1Sub, config.popupSubtitle || "Spin the wheel to unlock premium discount rewards.");

    const s1Btn = document.createElement("button");
    s1Btn.className = "ds-btn-primary";
    setText(s1Btn, config.step1Label || "SPIN TO WIN");
    s1Btn.addEventListener("click", () => goToScreen(2));

    s1.appendChild(s1Title);
    s1.appendChild(s1Sub);
    s1.appendChild(s1Btn);

    // ===== SCREEN 2: Discount Spinner =====
    const s2 = document.createElement("div");
    s2.className = "ds-screen";
    s2.id = "ds-screen-2";

    const s2SpinLabel = document.createElement("div");
    s2SpinLabel.className = "ds-spinning-label";
    s2SpinLabel.id = "ds-spin-label";
    s2SpinLabel.textContent = "SPINNING...";

    const s2WheelWrap = document.createElement("div");
    s2WheelWrap.className = "ds-wheel-wrap";

    const s2Pointer = document.createElement("div");
    s2Pointer.className = "ds-pointer";

    const s2Canvas = document.createElement("canvas");
    s2Canvas.id = "ds-wheel-canvas";
    s2Canvas.width = 290;
    s2Canvas.height = 290;

    const s2CenterGlow = document.createElement("div");
    s2CenterGlow.className = "ds-center-glow";

    s2WheelWrap.appendChild(s2Pointer);
    s2WheelWrap.appendChild(s2Canvas);
    s2WheelWrap.appendChild(s2CenterGlow);

    s2.appendChild(s2SpinLabel);
    s2.appendChild(s2WheelWrap);

    // ===== SCREEN 3: Jackpot Unlocked =====
    const s3 = document.createElement("div");
    s3.className = "ds-screen";
    s3.id = "ds-screen-3";

    const s3Header = document.createElement("div");
    s3Header.className = "ds-title";
    s3Header.textContent = "JACKPOT WINNER! 💎";

    const s3Card = document.createElement("div");
    s3Card.className = "ds-jackpot-card";
    s3Card.id = "ds-jackpot-card";

    const s3Sub = document.createElement("div");
    s3Sub.className = "ds-subtitle";
    s3Sub.textContent = "Wait, you've unlocked a second spin to win a FREE PRODUCT!";

    const s3Btn = document.createElement("button");
    s3Btn.className = "ds-btn-primary";
    setText(s3Btn, config.step3Label || "SPIN FOR FREE PRODUCTS");
    s3Btn.addEventListener("click", () => goToScreen(4));

    s3.appendChild(s3Header);
    s3.appendChild(s3Card);
    s3.appendChild(s3Sub);
    s3.appendChild(s3Btn);

    // ===== SCREEN 4: Product Spinner =====
    const s4 = document.createElement("div");
    s4.className = "ds-screen";
    s4.id = "ds-screen-4";

    const s4SpinLabel = document.createElement("div");
    s4SpinLabel.className = "ds-spinning-label";
    s4SpinLabel.textContent = "SPINNING FOR FREE PRODUCT...";

    const s4WheelWrap = document.createElement("div");
    s4WheelWrap.className = "ds-wheel-wrap";

    const s4Pointer = document.createElement("div");
    s4Pointer.className = "ds-pointer";

    const s4Canvas = document.createElement("canvas");
    s4Canvas.id = "ds-wheel2-canvas";
    s4Canvas.width = 290;
    s4Canvas.height = 290;

    const s4CenterGlow = document.createElement("div");
    s4CenterGlow.className = "ds-center-glow";

    s4WheelWrap.appendChild(s4Pointer);
    s4WheelWrap.appendChild(s4Canvas);
    s4WheelWrap.appendChild(s4CenterGlow);

    s4.appendChild(s4SpinLabel);
    s4.appendChild(s4WheelWrap);

    // ===== SCREEN 5: Final Rewards Claim =====
    const s5 = document.createElement("div");
    s5.className = "ds-screen";
    s5.id = "ds-screen-5";

    const s5Title = document.createElement("div");
    s5Title.className = "ds-title";
    s5Title.textContent = "Claim Your Rewards";

    const s5TimerRow = document.createElement("div");
    s5TimerRow.className = "ds-timer-row";
    const s5TimerIcon = document.createElement("span");
    s5TimerIcon.textContent = "⏱";
    const s5TimerText = document.createElement("span");
    s5TimerText.textContent = "OFFER EXPIRES IN:";
    const s5TimerBadge = document.createElement("div");
    s5TimerBadge.className = "ds-timer-badge";
    s5TimerBadge.id = "ds-timer-badge";
    s5TimerBadge.textContent = "10:00";
    s5TimerRow.appendChild(s5TimerIcon);
    s5TimerRow.appendChild(s5TimerText);
    s5TimerRow.appendChild(s5TimerBadge);

    const s5RewardsBox = document.createElement("div");
    s5RewardsBox.className = "ds-rewards-box";

    // Discount Reward
    const s5DiscountItem = document.createElement("div");
    s5DiscountItem.className = "ds-reward-item";
    s5DiscountItem.id = "ds-discount-item";

    // Product Gift Reward
    const s5ProductItem = document.createElement("div");
    s5ProductItem.className = "ds-reward-item";
    s5ProductItem.id = "ds-product-item";

    s5RewardsBox.appendChild(s5DiscountItem);
    s5RewardsBox.appendChild(s5ProductItem);

    const s5EmailWrap = document.createElement("div");
    s5EmailWrap.className = "ds-email-wrap";
    const s5EmailIcon = document.createElement("span");
    s5EmailIcon.className = "ds-email-icon";
    s5EmailIcon.textContent = "✉";
    const s5EmailInput = document.createElement("input");
    s5EmailInput.type = "email";
    s5EmailInput.className = "ds-email-input";
    s5EmailInput.id = "ds-email-input";
    s5EmailInput.placeholder = "Enter your email to claim";
    s5EmailInput.autocomplete = "email";
    s5EmailInput.maxLength = 254;
    s5EmailWrap.appendChild(s5EmailIcon);
    s5EmailWrap.appendChild(s5EmailInput);

    const s5ErrorMsg = document.createElement("div");
    s5ErrorMsg.className = "ds-error-msg";
    s5ErrorMsg.id = "ds-email-error";

    const s5SubmitBtn = document.createElement("button");
    s5SubmitBtn.className = "ds-btn-primary";
    s5SubmitBtn.id = "ds-btn-unlock";
    setText(s5SubmitBtn, config.step5Label || "CLAIM MY OFFER");
    s5SubmitBtn.addEventListener("click", handleEmailSubmit);

    const s5Privacy = document.createElement("div");
    s5Privacy.className = "ds-privacy-note";
    const s5PrivacyIcon = document.createElement("span");
    s5PrivacyIcon.textContent = "🔒";
    const s5PrivacyText = document.createElement("span");
    s5PrivacyText.textContent = "Guaranteed secure checkouts. No spam, ever.";
    s5Privacy.appendChild(s5PrivacyIcon);
    s5Privacy.appendChild(s5PrivacyText);

    s5.appendChild(s5Title);
    s5.appendChild(s5TimerRow);
    s5.appendChild(s5RewardsBox);
    s5.appendChild(s5EmailWrap);
    s5.appendChild(s5ErrorMsg);
    s5.appendChild(s5SubmitBtn);
    s5.appendChild(s5Privacy);

    // ===== SCREEN 6: Success & Redirect Loading =====
    const s6 = document.createElement("div");
    s6.className = "ds-screen";
    s6.id = "ds-screen-6";

    const s6Icon = document.createElement("div");
    s6Icon.style.fontSize = "60px";
    s6Icon.textContent = "🛒";

    const s6Title = document.createElement("div");
    s6Title.className = "ds-title";
    s6Title.textContent = "Applying Reward...";

    const s6Sub = document.createElement("div");
    s6Sub.className = "ds-subtitle";
    s6Sub.textContent = "Adding gift to cart & applying discount code. Redirecting you to checkout...";

    s6.appendChild(s6Icon);
    s6.appendChild(s6Title);
    s6.appendChild(s6Sub);

    return [s1, s2, s3, s4, s5, s6];
  }

  // ========== STICKY WIDGET ==========
  function buildStickyWidget() {
    const sticky = document.createElement('div');
    sticky.id = 'ds-sticky-widget';
    
    const title = document.createElement('div');
    title.className = 'ds-sticky-title';
    title.textContent = 'OFFER APPLIED AT CHECKOUT';
    
    const timer = document.createElement('div');
    timer.className = 'ds-sticky-timer';
    timer.id = 'ds-sticky-timer';
    timer.textContent = '00:00:00';
    
    const btn = document.createElement('button');
    btn.className = 'ds-sticky-btn';
    btn.textContent = 'SHOP NOW';
    btn.onclick = () => {
      // Directs them to collections or just closes if already there
      if (!window.location.pathname.includes('/collections/')) {
        window.location.href = '/collections/all';
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    sticky.appendChild(title);
    sticky.appendChild(timer);
    sticky.appendChild(btn);
    
    document.body.appendChild(sticky);
    return sticky;
  }

  function checkStickyWidget() {
    const expiration = localStorage.getItem("ds_expiration_time");
    const hasPending = localStorage.getItem("pending_gift_variant") || localStorage.getItem("added_gift_variant");
    
    if (expiration && hasPending) {
      const expTime = parseInt(expiration, 10);
      if (Date.now() < expTime) {
        injectStyles();
        const sticky = buildStickyWidget();
        sticky.style.display = 'block';
        
        function formatTime(s) {
          const h = Math.floor(s / 3600);
          const m = Math.floor((s % 3600) / 60);
          const sec = s % 60;
          if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
          return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
        }
        
        const timerEl = document.getElementById("ds-sticky-timer");
        const stickyInterval = setInterval(() => {
          const now = Date.now();
          const secondsLeft = Math.max(0, Math.floor((expTime - now) / 1000));
          if (timerEl) timerEl.textContent = formatTime(secondsLeft);
          
          if (secondsLeft <= 0) {
            clearInterval(stickyInterval);
            sticky.style.display = 'none';
            showExpiredPopupStandalone();
          }
        }, 1000);
      } else {
        showExpiredPopupStandalone();
      }
    }
  }

  async function showExpiredPopupStandalone() {
    injectStyles();
    
    const addedVariant = localStorage.getItem("added_gift_variant") || localStorage.getItem("pending_gift_variant");
    const addedDiscount = localStorage.getItem("added_discount_code") || localStorage.getItem("pending_discount_code");

    localStorage.removeItem("pending_gift_variant");
    localStorage.removeItem("pending_discount_code");
    localStorage.removeItem("ds_expiration_time");
    localStorage.removeItem("added_gift_variant");
    localStorage.removeItem("added_discount_code");

    let needsRefresh = false;

    // Remove from Shopify Cart
    if (addedVariant) {
      try {
        await window.fetch((window.Shopify?.routes?.root || "/") + "cart/change.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: String(addedVariant),
            quantity: 0
          })
        });
        needsRefresh = true;
      } catch (e) {}
    }

    // Clear discount cookie
    if (addedDiscount) {
      try {
        document.cookie = "discount_code=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "discount_code=; path=/; domain=" + window.location.hostname + "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } catch (e) {}
    }

    // Refresh if on cart page so user sees items removed
    // We do this when they close the popup.

    const overlay = document.createElement("div");
    overlay.id = "ds-overlay";

    const modal = document.createElement("div");
    modal.id = "ds-modal";

    const expired = document.createElement("div");
    expired.className = "ds-expired ds-screen active";
    const icon = document.createElement("div");
    icon.style.fontSize = "50px";
    icon.textContent = "⏰";
    const title = document.createElement("div");
    title.className = "ds-title";
    title.textContent = "Offer Expired";
    const sub = document.createElement("div");
    sub.className = "ds-subtitle";
    sub.textContent = "Your reserved offer has expired. Spin again on your next visit!";
    const btn = document.createElement("button");
    btn.className = "ds-btn-primary";
    btn.textContent = "CLOSE";
    btn.addEventListener("click", () => {
        overlay.style.animation = "dsOverlayOut 0.3s ease forwards";
        setTimeout(() => {
          overlay.remove();
          if (needsRefresh && window.location.pathname.endsWith('/cart')) {
            window.location.reload();
          }
        }, 300);
    });

    expired.appendChild(icon);
    expired.appendChild(title);
    expired.appendChild(sub);
    expired.appendChild(btn);
    modal.appendChild(expired);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ========== NAVIGATION ==========
  function goToScreen(n) {
    document.querySelectorAll(".ds-screen").forEach((el) => {
      el.classList.remove("active");
    });
    const target = document.getElementById(`ds-screen-${n}`);
    if (target) target.classList.add("active");
    updateProgress(n);

    if (n === 2) startDiscountSpin();
    if (n === 4) startProductSpin();
    if (n === 5) startTimer();
  }

  // Progress Bar updates
  function updateProgress(step) {
    const fill = document.getElementById("ds-progress-fill");
    const label = document.getElementById("ds-step-label");
    const map = { 1: 0, 2: 20, 3: 40, 4: 60, 5: 80, 6: 100 };
    if (fill) fill.style.width = `${map[step] || 0}%`;

    if (label) {
      if (step <= 2) setText(label, "0/2 REWARDS UNLOCKED");
      else if (step <= 4) setText(label, "1/2 REWARDS UNLOCKED");
      else setText(label, "2/2 REWARDS UNLOCKED");
    }
  }

  // ========== SPIN LOGIC ==========
  function startDiscountSpin() {
    const config = spinnerConfig;
    const segments = JSON.parse(config.discountSegments || "[]");
    if (!segments.length) return;

    const targetSeg = weightedRandom(segments);
    const targetIndex = segments.indexOf(targetSeg);
    wonDiscount = targetSeg;

    const canvas = document.getElementById("ds-wheel-canvas");
    if (!canvas) return;

    drawWheel(canvas, segments, 0);

    setTimeout(() => {
      spinWheel(canvas, segments, targetIndex, () => {
        const card = document.getElementById("ds-jackpot-card");
        if (card) setText(card, `${targetSeg.label} WON! 🎉`);

        const spinLabel = document.getElementById("ds-spin-label");
        if (spinLabel) {
          spinLabel.textContent = "✓ UNLOCKED!";
        }
        setTimeout(() => goToScreen(3), 900);
      });
    }, 400);
  }

  function startProductSpin() {
    const config = spinnerConfig;
    const segments = JSON.parse(config.productSegments || "[]");
    if (!segments.length) return;

    const targetSeg = weightedRandom(segments);
    const targetIndex = segments.indexOf(targetSeg);
    wonProduct = targetSeg;

    const canvas = document.getElementById("ds-wheel2-canvas");
    if (!canvas) return;

    drawWheel(canvas, segments, 0);

    setTimeout(() => {
      spinWheel(canvas, segments, targetIndex, () => {
        populateFinalScreen();
        setTimeout(() => goToScreen(5), 900);
      });
    }, 400);
  }

  // ========== POPULATE FINAL SCREEN ==========
  function populateFinalScreen() {
    // Discount item
    const discountItem = document.getElementById("ds-discount-item");
    if (discountItem && wonDiscount) {
      discountItem.replaceChildren();

      const icon = document.createElement("div");
      icon.className = "ds-reward-icon";
      icon.textContent = "🏷️";

      const textWrap = document.createElement("div");
      textWrap.className = "ds-reward-details";
      const mainText = document.createElement("div");
      mainText.className = "ds-reward-title";
      setText(mainText, wonDiscount.label);
      const subText = document.createElement("div");
      subText.className = "ds-reward-sub";
      subText.textContent = `Discount Code: ${wonDiscount.code}`;

      textWrap.appendChild(mainText);
      textWrap.appendChild(subText);
      discountItem.appendChild(icon);
      discountItem.appendChild(textWrap);
    }

    // Product item
    const productItem = document.getElementById("ds-product-item");
    if (productItem && wonProduct) {
      productItem.replaceChildren();

      const icon = document.createElement("div");
      icon.className = "ds-reward-icon";

      if (wonProduct.imageUrl) {
        const img = document.createElement("img");
        const safeUrl = /^https:\/\//.test(wonProduct.imageUrl) ? wonProduct.imageUrl : "";
        if (safeUrl) {
          img.src = safeUrl;
          img.alt = String(wonProduct.label).slice(0, 50);
          img.loading = "lazy";
          icon.appendChild(img);
        } else {
          icon.textContent = "🎁";
        }
      } else {
        icon.textContent = "🎁";
      }

      const textWrap = document.createElement("div");
      textWrap.className = "ds-reward-details";
      const mainText = document.createElement("div");
      mainText.className = "ds-reward-title";
      setText(mainText, wonProduct.label);
      const subText = document.createElement("div");
      subText.className = "ds-reward-sub";
      subText.textContent = "FREE PRODUCT UNLOCKED";

      textWrap.appendChild(mainText);
      textWrap.appendChild(subText);
      productItem.appendChild(icon);
      productItem.appendChild(textWrap);
    }
  }

  // ========== TIMER ==========
  function startTimer() {
    const config = spinnerConfig;
    const minutes = parseInt(config.timerDuration || "1", 10);
    
    let expiration = localStorage.getItem("ds_expiration_time");
    if (!expiration) {
      expiration = Date.now() + minutes * 60000;
      localStorage.setItem("ds_expiration_time", expiration.toString());
    } else {
      expiration = parseInt(expiration, 10);
    }

    const badge = document.getElementById("ds-timer-badge");

    function formatTime(s) {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }

    function update() {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.floor((expiration - now) / 1000));
      if (badge) setText(badge, formatTime(secondsLeft));
      return secondsLeft;
    }

    update();
    timerInterval = setInterval(() => {
      const secondsLeft = update();
      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        offerExpired = true;
        showExpired();
      }
    }, 1000);
  }

  function showExpired() {
    document.querySelectorAll(".ds-screen").forEach((el) => el.classList.remove("active"));
    const modal = document.getElementById("ds-modal");
    if (!modal) return;

    const expired = document.createElement("div");
    expired.className = "ds-expired ds-screen active";
    const icon = document.createElement("div");
    icon.style.fontSize = "50px";
    icon.textContent = "⏰";
    const title = document.createElement("div");
    title.className = "ds-title";
    title.textContent = "Offer Expired";
    const sub = document.createElement("div");
    sub.className = "ds-subtitle";
    sub.textContent = "Your reserved offer has expired. Spin again on your next visit!";
    const btn = document.createElement("button");
    btn.className = "ds-btn-primary";
    btn.textContent = "CLOSE";
    btn.addEventListener("click", closeWidget);

    expired.appendChild(icon);
    expired.appendChild(title);
    expired.appendChild(sub);
    expired.appendChild(btn);
    modal.appendChild(expired);
  }

  // ========== EMAIL CLAIM & AUTO ADD TO CART ==========
  async function handleEmailSubmit() {
    const emailInput = document.getElementById("ds-email-input");
    const errorEl = document.getElementById("ds-email-error");
    const btn = document.getElementById("ds-btn-unlock");

    if (!emailInput) return;

    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      if (errorEl) errorEl.textContent = "Please enter a valid email address.";
      emailInput.focus();
      return;
    }

    if (errorEl) errorEl.textContent = "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "SAVING REWARD...";
    }

    try {
      // 1. Submit lead to local database
      const response = await fetch(`${APP_URL}/api/claim-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: SHOP,
          email: email,
          discountCode: wonDiscount?.code || "",
          productLabel: wonProduct?.label || "",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to claim offer. Try again.");
      }

      // Lead saved successfully in DB! Transition to success loading screen
      goToScreen(6);
      try {
        localStorage.setItem("ds-seen", "1");
      } catch (_) {}

      // Store pending rewards in localStorage so they get added on any product add to cart
      if (wonProduct && wonProduct.variantId) {
        localStorage.setItem("pending_gift_variant", wonProduct.variantId);
      }
      if (wonDiscount && wonDiscount.code) {
        localStorage.setItem("pending_discount_code", wonDiscount.code);
        try {
          // Set the discount code cookie directly in browser for maximum reliability
          document.cookie = "discount_code=" + encodeURIComponent(wonDiscount.code) + "; path=/; max-age=3600; SameSite=Lax";
          document.cookie = "discount_code=" + encodeURIComponent(wonDiscount.code) + "; path=/; domain=" + window.location.hostname + "; max-age=3600; SameSite=Lax";
        } catch (_) {}
      }

      // Redirect to the All Products collection page after showing success screen
      setTimeout(() => {
        window.location.href = "/collections/all";
      }, 1500);

    } catch (err) {
      if (errorEl) errorEl.textContent = err.message || "Network error. Please try again.";
      if (btn) {
        btn.disabled = false;
        setText(btn, spinnerConfig?.step5Label || "CLAIM MY OFFER");
      }
    }
  }

  // ========== CLOSE WIDGET ==========
  function closeWidget() {
    if (timerInterval) clearInterval(timerInterval);
    const overlay = document.getElementById("ds-overlay");
    if (overlay) {
      overlay.style.animation = "dsOverlayOut 0.3s ease forwards";
      setTimeout(() => overlay.remove(), 300);
    }
    try {
      localStorage.setItem("ds-seen", "1");
    } catch (_) {}
  }

  // ========== DYNAMIC CART INTERCEPTOR FOR PENDING OFFERS ==========
  function setupCartInterceptor() {
    try {
      const giftVariant = localStorage.getItem("pending_gift_variant");
      const discountCode = localStorage.getItem("pending_discount_code");

      if (!giftVariant) return;

      const originalFetch = window.fetch;
      let isAddingGift = false;

      async function addFreeProductAndDiscount() {
        if (isAddingGift) return;
        isAddingGift = true;

        try {
          // Add the free product to the cart (using originalFetch to avoid interception recursion)
          const formData = {
            items: [{
              id: parseInt(giftVariant, 10),
              quantity: 1
            }]
          };

          await originalFetch((window.Shopify?.routes?.root || "/") + "cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
          });

          // Clear pending items from localStorage so this only happens once
          localStorage.removeItem("pending_gift_variant");
          localStorage.removeItem("pending_discount_code");
          
          // Save added items so they can be removed if the timer expires
          localStorage.setItem("added_gift_variant", giftVariant);
          if (discountCode) {
            localStorage.setItem("added_discount_code", discountCode);
          }

          let redirectUrl = "/cart";
          if (discountCode) {
            try {
              document.cookie = "discount_code=" + encodeURIComponent(discountCode) + "; path=/; max-age=3600; SameSite=Lax";
              document.cookie = "discount_code=" + encodeURIComponent(discountCode) + "; path=/; domain=" + window.location.hostname + "; max-age=3600; SameSite=Lax";
            } catch (_) {}
            redirectUrl = `/discount/${encodeURIComponent(discountCode)}?redirect=/cart`;
          }

          // Force page reload on the cart page to show both products added with discount
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 400);

        } catch (err) {
          console.error("Error adding free product:", err);
        } finally {
          isAddingGift = false;
        }
      }

      // Intercept window.fetch to capture AJAX additions
      window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        
        if (url.includes('/cart/add') && response.ok) {
          addFreeProductAndDiscount();
        }
        return response;
      };

      // Intercept XMLHttpRequest to capture XHR additions
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
          if (this._url && this._url.includes('/cart/add') && this.status >= 200 && this.status < 300) {
            addFreeProductAndDiscount();
          }
        });
        return originalSend.apply(this, arguments);
      };

      // Intercept form submissions targeting the cart
      document.addEventListener("submit", function (e) {
        const action = e.target?.action || e.target?.getAttribute("action") || "";
        if (action.includes("/cart/add")) {
          e.preventDefault();
          const formData = new FormData(e.target);
          originalFetch((window.Shopify?.routes?.root || "/") + "cart/add.js", {
            method: "POST",
            body: formData
          }).then(() => {
            addFreeProductAndDiscount();
          }).catch(() => {
            e.target.submit();
          });
        }
      });

      // Check if we are currently on the cart page directly, and haven't added the gift yet
      if (window.location.pathname.endsWith('/cart')) {
        originalFetch((window.Shopify?.routes?.root || "/") + "cart.js")
          .then(res => res.json())
          .then(cart => {
            if (cart.item_count > 0) {
              const hasGift = cart.items.some(item => item.variant_id == giftVariant);
              if (!hasGift) {
                addFreeProductAndDiscount();
              }
            }
          })
          .catch(() => {});
      }
    } catch (_) {}
  }

  // ========== INIT ==========
  async function init() {
    // Setup the cart interceptor for pending free products
    setupCartInterceptor();

    // Check if seen before
    try {
      if (localStorage.getItem("ds-seen") === "1") {
        checkStickyWidget();
        return;
      }
    } catch (_) {}

    // Fetch config
    try {
      const res = await fetch(
        `${APP_URL}/api/spinner-config?shop=${encodeURIComponent(SHOP)}`
      );
      if (!res.ok) return;
      spinnerConfig = await res.json();
    } catch (_) {
      return;
    }

    if (!spinnerConfig || !spinnerConfig.triggerEnabled) return;

    const delay = parseInt(spinnerConfig.triggerDelay || "3", 10) * 1000;

    setTimeout(() => {
      // Ensure Shopify properties are present
      if (!window.Shopify || !window.Shopify.routes) {
        window.Shopify = window.Shopify || {};
        window.Shopify.routes = window.Shopify.routes || { root: "/" };
      }

      injectStyles();
      const overlay = buildModal();
      document.body.appendChild(overlay);

      // Draw initial wheel (discount)
      const discountSegments = JSON.parse(spinnerConfig.discountSegments || "[]");
      const canvas = document.getElementById("ds-wheel-canvas");
      if (canvas && discountSegments.length) {
        drawWheel(canvas, discountSegments, 0);
      }

      // Draw second wheel canvas to pre-populate it
      const productSegments = JSON.parse(spinnerConfig.productSegments || "[]");
      const canvas2 = document.getElementById("ds-wheel2-canvas");
      if (canvas2 && productSegments.length) {
        drawWheel(canvas2, productSegments, 0);
      }
    }, delay);
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Escape key support
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const overlay = document.getElementById("ds-overlay");
      if (overlay) closeWidget();
    }
  });

  const fadeOutStyle = document.createElement("style");
  fadeOutStyle.textContent = `
    @keyframes dsOverlayOut {
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(fadeOutStyle);
})();
