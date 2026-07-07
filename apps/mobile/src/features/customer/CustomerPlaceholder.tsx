import { Text } from "react-native";
import { orderStatuses } from "@leopard/shared";

import { FoundationCard } from "../../components/FoundationCard";
import { textStyles } from "../../theme";

export function CustomerPlaceholder() {
  return (
    <FoundationCard
      title="Customer placeholder"
      caption="Customer booking screens will be implemented after auth and backend order APIs."
    >
      <Text style={textStyles.meta}>
        Initial order status: {orderStatuses[0]}
      </Text>
    </FoundationCard>
  );
}
