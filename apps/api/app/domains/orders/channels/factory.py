from app.domains.orders.channels.base import OrderChannel
from app.domains.orders.channels.perch import PerchChannel
from app.domains.orders.channels.swiggy import SwiggyChannel
from app.domains.orders.channels.zomato import ZomatoChannel
from app.domains.orders.models import OrderSource


def get_order_channel(source: OrderSource | str) -> OrderChannel:
    """Returns the appropriate OrderChannel implementation driver for a given OrderSource."""
    source_str = str(source).upper()

    if source_str in (OrderSource.ZOMATO.value, "ZOMATO"):
        return ZomatoChannel()
    elif source_str in (OrderSource.SWIGGY.value, "SWIGGY"):
        return SwiggyChannel()
    else:
        return PerchChannel()
