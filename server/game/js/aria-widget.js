

(function() {
    // 1. Create the Styles
    const style = document.createElement('style');
    style.innerHTML = `
    
        #aria-input { 
            flex: 1; 
            border: 1px solid #ddd; 
            border-radius: 20px; 
            padding: 8px 15px; 
            outline: none; 
            color: #2f3542; /* This makes the text dark gray/black */
            background: white; 
        }
        #aria-btn { position: fixed; bottom: 20px; right: 20px; width: 200px; height: 60px; background: #6c5ce7; border-radius: 25px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9999; }
        #aria-box { position: fixed; bottom: 90px; right: 20px; width: 300px; height: 400px; background: white; border-radius: 15px; display: none; flex-direction: column; box-shadow: 0 5px 25px rgba(0,0,0,0.2); z-index: 9999; overflow: hidden; font-family: sans-serif; }
        #aria-header { background: #6c5ce7; color: white; padding: 15px; font-weight: bold; }
        #aria-messages { flex: 1; padding: 10px; overflow-y: auto; font-size: 14px; display: flex; flex-direction: column; gap: 8px; }
        #aria-input-area { padding: 10px; border-top: 1px solid #eee; display: flex; }
        #aria-input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 15px; outline: none; }
        .aria-msg { padding: 8px 12px; border-radius: 15px; max-width: 80%; }
        .user-msg { background: #6c5ce7; color: white; align-self: flex-end; }
        .bot-msg { background: #f1f2f6; color: #2f3542; align-self: flex-start; }
    `;
    document.head.appendChild(style);

    // 2. Create the HTML
    const btn = document.createElement('div');
    btn.id = 'aria-btn';
    btn.innerHTML = '✨ Ask Aria';
    
    const box = document.createElement('div');
    box.id = 'aria-box';
    box.innerHTML = `
        <div id="aria-header">Aria Assistant</div>
        <div id="aria-messages"><div class="aria-msg bot-msg">Hi! How can I help with the kids' learning today?</div></div>
        <div id="aria-input-area"><input type="text" id="aria-input" placeholder="Ask me anything..."></div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(box);

    // 3. Logic
    btn.onclick = () => box.style.display = box.style.display === 'none' ? 'flex' : 'none';

    const input = document.querySelector('#aria-input');
    const msgBox = document.querySelector('#aria-messages');

    input.onkeypress = async (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            const userText = input.value;
            input.value = '';
            
            // Show User Message
            msgBox.innerHTML += `<div class="aria-msg user-msg">${userText}</div>`;
            
            // Talk to Server
            const response = await fetch('/api/aria-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, context: window.location.pathname })
            });
            const data = await response.json();
            
            // Show Aria Response
            msgBox.innerHTML += `<div class="aria-msg bot-msg">${data.reply}</div>`;
            msgBox.scrollTop = msgBox.scrollHeight;
        }
    };
})();