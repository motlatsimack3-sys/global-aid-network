import OQL "mo:caffeineai-oql";
import Types "donations";

module {
  /// Map a donation status variant to a single OQL text value.
  public func _toRow(self : Types.DonationStatus) : OQL.Value {
    #text(
      switch (self) {
        case (#pending) { "pending" };
        case (#completed) { "completed" };
        case (#failed) { "failed" };
      }
    );
  };
};
