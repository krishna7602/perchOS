import os
import re

replacements = {
    r'@/components/admin/QrDisplay': r'@/features/venues/components/QrDisplay',
    r'@/components/chat/ChatRoom': r'@/features/chat/components/ChatRoom',
    r'@/components/chat/DMPanel': r'@/features/chat/components/DMPanel',
    r'@/components/chat/NameEntryForm': r'@/features/chat/components/NameEntryForm',
    r'@/components/chat/OnlineUsersBar': r'@/features/chat/components/OnlineUsersBar',
    r'@/components/checkout/PaymentMethodPicker': r'@/features/orders/components/PaymentMethodPicker',
    r'@/components/menu/CartDrawer': r'@/features/menu/components/CartDrawer',
    r'@/components/menu/MenuList': r'@/features/menu/components/MenuList',
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
            
for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.ts') or f.endswith('.tsx'):
            process_file(os.path.join(root, f))
