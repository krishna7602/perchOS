import asyncio
from beanie import PydanticObjectId
from app.domains.orders.models import Order
from app.domains.auth.models import User, Role, StaffStatus

class TaskScheduler:
    """
    CPU-Scheduler inspired Task Allocation for Kitchen Staff.
    Assigns incoming orders to the most optimal chef based on current load and historical performance.
    """
    
    @staticmethod
    async def dispatch_order(order_id: str, branch_id: str):
        # Allow short delay so order creation fully commits if this was called asynchronously
        await asyncio.sleep(0.5) 

        order = await Order.get(PydanticObjectId(order_id))
        if not order:
            return
        if order.assigned_chef_id or order.order_status in ["ready", "served"]:
            return

        # 1. Get all chefs in this branch who are available to take orders
        chefs = await User.find(
            {
                "branch_id": PydanticObjectId(branch_id), 
                "role": Role.CHEF, 
                "status": {"$in": [StaffStatus.AVAILABLE, StaffStatus.PREPARING, StaffStatus.BUSY]}
            }
        ).to_list()

        # Filter out chefs who already rejected this specific order
        chefs = [c for c in chefs if c.id not in order.rejected_by]

        if not chefs:
            # No chefs available to assign, leave it unassigned
            # Manager can manually assign or wait for a chef to become available
            return

        best_chef = None
        lowest_score = float('inf')

        for chef in chefs:
            # Calculate Current Load (active orders)
            active_orders = await Order.find(
                {"assigned_chef_id": chef.id, "order_status": {"$in": ["received", "preparing"]}}
            ).count()
            
            # Calculate Avg Prep Time from historical completed orders
            completed_orders = await Order.find(
                {
                    "assigned_chef_id": chef.id, 
                    "order_status": {"$in": ["ready", "served"]}, 
                    "completed_at": {"$ne": None}
                }
            ).to_list()
            
            # Default to 15 mins if no history
            avg_time = 15.0
            if completed_orders:
                total_time = sum((o.completed_at - o.created_at).total_seconds() for o in completed_orders)
                avg_time = (total_time / len(completed_orders)) / 60.0
                
            skill_score = 1.0 # Future expansion: vary by chef level
            
            # --- WEIGHTED SCHEDULING FORMULA ---
            # W1 (Load Weight) = 10.0 (Current load heavily impacts next assignment)
            # W2 (Time Weight) = 1.0  (Avg prep time in minutes)
            # W3 (Skill Weight) = 0.0 (Placeholder)
            score = (active_orders * 10.0) + (avg_time * 1.0)
            
            if score < lowest_score:
                lowest_score = score
                best_chef = chef
                
        if best_chef:
            order.assigned_chef_id = best_chef.id
            await order.save()
            print(f"[Scheduler] Assigned Order {order.id} to Chef {best_chef.name} (Score: {lowest_score})")
            
            # Trigger WebSocket popup for the Chef
            from app.domains.venues.branch_model import Branch
            branch = await Branch.get(PydanticObjectId(branch_id))
            branch_name = branch.name if branch else "Venue"

            from app.domains.chat.manager import chat_manager
            await chat_manager.unicast(
                branch_id, 
                str(best_chef.id), 
                {
                    "type": "order_assigned", 
                    "order_id": str(order.id),
                    "order_token": order.order_token,
                    "total": order.total,
                    "venue_name": branch_name
                }
            )
