import os
import re

replacements = {
    # Auth
    r'app\.routers\.auth': r'app.domains.auth.router',
    r'app\.routers\.superadmin': r'app.domains.auth.superadmin',
    r'app\.models\.user': r'app.domains.auth.models',
    r'app\.schemas\.auth': r'app.domains.auth.schemas',
    
    # Venues
    r'app\.routers\.branches': r'app.domains.venues.branches',
    r'app\.models\.restaurant': r'app.domains.venues.restaurant_model',
    r'app\.models\.branch': r'app.domains.venues.branch_model',
    r'app\.schemas\.venue': r'app.domains.venues.schemas',
    
    # Menu
    r'app\.routers\.menu': r'app.domains.menu.router',
    r'app\.models\.menu_item': r'app.domains.menu.models',
    r'app\.schemas\.menu': r'app.domains.menu.schemas',
    
    # Orders
    r'app\.routers\.orders': r'app.domains.orders.router',
    r'app\.models\.order': r'app.domains.orders.models',
    r'app\.schemas\.order': r'app.domains.orders.schemas',
    
    # Chat
    r'app\.routers\.chat_ws': r'app.domains.chat.router',
    r'app\.routers\.sessions': r'app.domains.chat.sessions',
    r'app\.schemas\.session': r'app.domains.chat.schemas',
    r'app\.services\.chat_manager': r'app.domains.chat.manager',
    r'app\.services\.moderation_service': r'app.domains.chat.moderation',
}

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = content
    for old, new in replacements.items():
        new_content = re.sub(old, new, new_content)
        
    if new_content != content:
        print(f"Updated {path}")
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
for root, _, files in os.walk('app'):
    for f in files:
        if f.endswith('.py'):
            process_file(os.path.join(root, f))
