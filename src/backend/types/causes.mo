import Common "../types/common";

module {
  public type CauseId = Common.CauseId;
  public type Timestamp = Common.Timestamp;

  /// Lifecycle state of a cause.
  public type CauseStatus = {
    #draft;
    #published;
    #closed;
  };

  /// Stored cause record.
  public type Cause = {
    id : CauseId;
    title : Text;
    description : Text;
    /// Object-storage reference for the cause image.
    imageRef : Text;
    /// Funding goal in the smallest currency unit (cents).
    goalCents : Nat;
    /// Amount raised so far in the smallest currency unit (cents).
    raisedCents : Nat;
    status : CauseStatus;
    createdAt : Timestamp;
  };

  /// Public projection of a cause, including derived progress.
  public type CauseView = {
    id : CauseId;
    title : Text;
    description : Text;
    imageRef : Text;
    goalCents : Nat;
    raisedCents : Nat;
    /// Progress in basis points (0..10000), 0 when goalCents is 0.
    progressBps : Nat;
    status : CauseStatus;
    createdAt : Timestamp;
  };

  /// Owner-supplied fields when creating or editing a cause.
  public type CauseInput = {
    title : Text;
    description : Text;
    imageRef : Text;
    goalCents : Nat;
  };
};
