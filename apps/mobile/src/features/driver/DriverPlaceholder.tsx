import { Text } from "react-native";
import { driverAvailabilities } from "@leopard/shared";

import { FoundationCard } from "../../components/FoundationCard";
import { textStyles } from "../../theme";

export function DriverPlaceholder() {
  return (
    <FoundationCard
      title="Driver placeholder"
      caption="Driver order discovery, accept, status, and tracking remain later-phase work."
    >
      <Text style={textStyles.meta}>
        Default availability: {driverAvailabilities[0]}
      </Text>
    </FoundationCard>
  );
}
