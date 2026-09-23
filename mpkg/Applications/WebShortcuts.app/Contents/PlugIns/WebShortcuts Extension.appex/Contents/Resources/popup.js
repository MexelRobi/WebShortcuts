document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    const shortcutTitle = document.getElementById('shortcutTitle');
  const shortcutCode = document.getElementById('shortcutCode');
  const shortcutsGrid = document.getElementById('shortcutsGrid');
  const status = document.getElementById('status');

    const editorModal = document.getElementById('editorModal');
  const editTitle = document.getElementById('editTitle');
  const editCode = document.getElementById('editCode');
  const saveEditBtn = document.getElementById('saveEditBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

    const deleteModal = document.getElementById('deleteModal');
  const deleteModalTitle = document.getElementById('deleteModalTitle');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

    let currentEditingIndex = null;
  let currentDeletingIndex = null;
  let dragSrcIndex = null;

    async function initTheme() {
    const data = await browser.storage.local.get({ userTheme: 'light' });
    if (data.userTheme === 'dark') {
      document.body.classList.add('dark-theme');
      themeToggleBtn.textContent = '◑';
    } else {
      document.body.classList.remove('dark-theme');
      themeToggleBtn.textContent = '◐';
    }
  }

  themeToggleBtn.addEventListener('click', async () => {
    const isDark = document.body.classList.toggle('dark-theme');
    const newTheme = isDark ? 'dark' : 'light';
    themeToggleBtn.textContent = isDark ? '◑' : '◐';
    await browser.storage.local.set({ userTheme: newTheme });
  });

    async function renderWorkspace() {
    const data = await browser.storage.local.get({ shortcutsArray: [] });
    drawShortcutsGrid(data.shortcutsArray);
  }

  function drawShortcutsGrid(list) {
    shortcutsGrid.innerHTML = list.length === 0 ? `<div style="color:var(--text-sub); font-size:12px; grid-column:span 2; text-align:center; padding:10px;">No shortcuts created yet</div>` : '';
    
    list.forEach((item, index) => {
      const cell = document.createElement('div');
      cell.className = 'kachel shortcut-kachel';
      cell.setAttribute('draggable', 'true');
      
      const title = document.createElement('div');
      title.className = 'kachel-title';
      title.textContent = item.name;
      
      cell.addEventListener('click', () => dispatchScriptToWebpage(item.code));

            cell.addEventListener('dragstart', (e) => {
        cell.classList.add('dragging');
        dragSrcIndex = index;
        e.dataTransfer.effectAllowed = 'move';
      });

      cell.addEventListener('dragover', (e) => {
        if (e.preventDefault) e.preventDefault();
        cell.classList.add('drag-over');
        return false;
      });

      cell.addEventListener('dragleave', () => {
        cell.classList.remove('drag-over');
      });

      cell.addEventListener('drop', async (e) => {
        if (e.stopPropagation) e.stopPropagation();
        cell.classList.remove('drag-over');
        
        if (dragSrcIndex !== index) {
          const currentData = await browser.storage.local.get({ shortcutsArray: [] });
          const targetList = currentData.shortcutsArray;
          
          const draggedItem = targetList.splice(dragSrcIndex, 1);
          targetList.splice(index, 0, draggedItem);
          
          await browser.storage.local.set({ shortcutsArray: targetList });
          renderWorkspace();
        }
        return false;
      });

      cell.addEventListener('dragend', () => {
        cell.classList.remove('dragging');
        document.querySelectorAll('.kachel').forEach(k => k.classList.remove('drag-over'));
      });

            const ctrlDiv = document.createElement('div');
      ctrlDiv.className = 'controls';

            const shareBtn = document.createElement('button');
      shareBtn.className = 'ctrl-btn';
      shareBtn.innerHTML = '⎋';
      shareBtn.title = 'Copy code to clipboard';
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyShortcutToClipboard(item);
      });

            const editBtn = document.createElement('button');
      editBtn.className = 'ctrl-btn';
      editBtn.innerHTML = '✎';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openInlineEditor(index, item);
      });

            const delBtn = document.createElement('button');
      delBtn.className = 'ctrl-btn del';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteModal(index, item.name);
      });

      ctrlDiv.appendChild(shareBtn);
      ctrlDiv.appendChild(editBtn);
      ctrlDiv.appendChild(delBtn);
      cell.appendChild(title);
      cell.appendChild(ctrlDiv);
      shortcutsGrid.appendChild(cell);
    });
  }
        async function dispatchScriptToWebpage(targetScriptCode) {
      status.textContent = 'Injecting script...';
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url.startsWith('http')) {
          status.textContent = 'Cannot run on this tab.';
          return;
        }

        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: (rawCode) => {
            try {
              window.eval(rawCode);
            } catch (systemErr) {
              console.error('WebShortcuts Execution failure:', systemErr);
              alert('Script Error: ' + systemErr.message);
            }
          },
          args: [targetScriptCode]
        });
        status.textContent = 'Fired on page!';
        setTimeout(() => status.textContent = '', 1500);
      } catch (err) {
        status.textContent = 'Execution Failure: ' + err.message;
      }
    }

        function copyShortcutToClipboard(item) {
      try {
        navigator.clipboard.writeText(item.code).then(() => {
          status.style.color = 'var(--accent)';
          status.textContent = `"${item.name}" copied to clipboard!`;
          setTimeout(() => { status.textContent = ''; status.style.color = 'var(--text-sub)'; }, 2500);
        }).catch(err => {
          console.error('Clipboard permission denied:', err);
        });
      } catch (err) {
        console.error('Sharing vector collapsed:', err);
      }
    }

        function openInlineEditor(index, item) {
      currentEditingIndex = index;
      editTitle.value = item.name;
      editCode.value = item.code;
      editorModal.classList.add('active');
    }

    cancelEditBtn.addEventListener('click', () => {
      editorModal.classList.remove('active');
    });

    saveEditBtn.addEventListener('click', async () => {
      const data = await browser.storage.local.get({ shortcutsArray: [] });
      data.shortcutsArray[currentEditingIndex] = {
        name: editTitle.value.trim(),
        code: editCode.value.trim()
      };
      await browser.storage.local.set({ shortcutsArray: data.shortcutsArray });
      editorModal.classList.remove('active');
      renderWorkspace();
    });

        function openDeleteModal(index, name) {
      currentDeletingIndex = index;
      deleteModalTitle.textContent = `Delete "${name}"?`;
      deleteModal.classList.add('active');
    }

    cancelDeleteBtn.addEventListener('click', () => {
      deleteModal.classList.remove('active');
    });

    confirmDeleteBtn.addEventListener('click', async () => {
      const data = await browser.storage.local.get({ shortcutsArray: [] });
      if (currentDeletingIndex !== null) {
        data.shortcutsArray.splice(currentDeletingIndex, 1);
        await browser.storage.local.set({ shortcutsArray: data.shortcutsArray });
      }
      deleteModal.classList.remove('active');
      currentDeletingIndex = null;
      renderWorkspace();
    });

        document.getElementById('addShortcutBtn').addEventListener('click', async () => {
      const name = shortcutTitle.value.trim();
      const code = shortcutCode.value.trim();
      if (!name || !code) return;

      const { shortcutsArray = [] } = await browser.storage.local.get({ shortcutsArray: [] });
      shortcutsArray.push({ name, code });
      await browser.storage.local.set({ shortcutsArray });

      shortcutTitle.value = '';
      shortcutCode.value = '';
      renderWorkspace();
    });

    initTheme();
    renderWorkspace();
  });
