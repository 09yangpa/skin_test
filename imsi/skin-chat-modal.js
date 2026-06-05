(function initSkinChatModal() {
  const openButtons = Array.from(document.querySelectorAll("[data-skin-chat-open]"));
  const modal = document.getElementById("skinChatModal");
  const frame = document.getElementById("skinChatModalFrame");

  if (!openButtons.length || !modal || !frame) {
    return;
  }

  const closeButtons = modal.querySelectorAll("[data-skin-chat-close]");
  const frameUrl = String(modal.dataset.skinChatFrameSrc || "./skin-chat-flow.html?embed=1").trim();
  let lastFocusedElement = null;

  function openModal() {
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("skin-chat-modal-open");
    if (!frame.getAttribute("src")) {
      frame.setAttribute("src", frameUrl);
    }
    window.requestAnimationFrame(() => {
      modal.classList.add("is-open");
    });
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("skin-chat-modal-open");
    window.setTimeout(() => {
      if (modal.getAttribute("aria-hidden") === "true") {
        modal.hidden = true;
      }
    }, 220);
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  openButtons.forEach((button) => {
    button.addEventListener("click", openModal);
  });
  closeButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  const params = new URLSearchParams(window.location.search);
  if (modal.dataset.autoOpen === "true" || params.get("skinChat") === "1") {
    openModal();
  }
})();
