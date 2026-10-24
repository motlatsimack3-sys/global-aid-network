import OQL "mo:caffeineai-oql";
import Types "causes";

module {
  /// Map a cause status variant to a single OQL text value.
  public func _toRow(self : Types.CauseStatus) : OQL.Value {
    #text(
      switch (self) {
        case (#draft) { "draft" };
        case (#published) { "published" };
        case (#closed) { "closed" };
      }
    );
  };
};
