import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Common "../types/common";
import Types "../types/causes";

module {
  /// Convert a stored cause to its public view, deriving progress.
  public func toView(cause : Types.Cause) : Types.CauseView {
    let progressBps = if (cause.goalCents == 0) {
      0;
    } else {
      (cause.raisedCents * 10_000) / cause.goalCents;
    };
    {
      id = cause.id;
      title = cause.title;
      description = cause.description;
      imageRef = cause.imageRef;
      goalCents = cause.goalCents;
      raisedCents = cause.raisedCents;
      progressBps;
      status = cause.status;
      createdAt = cause.createdAt;
    };
  };

  /// List all published causes as views.
  public func listPublished(causes : Map.Map<Common.CauseId, Types.Cause>) : [Types.CauseView] {
    causes.values()
      .filter(func(cause) = cause.status == #published)
      .map(func(cause) = toView(cause))
      .toArray();
  };

  /// Read one cause by id as a view.
  public func getCause(causes : Map.Map<Common.CauseId, Types.Cause>, id : Common.CauseId) : ?Types.CauseView {
    switch (causes.get(id)) {
      case (?cause) { ?toView(cause) };
      case null { null };
    };
  };

  /// Create a new draft cause and return its id.
  public func createCause(
    causes : Map.Map<Common.CauseId, Types.Cause>,
    state : { var nextCauseId : Nat; var nextDonationId : Nat },
    input : Types.CauseInput,
    now : Common.Timestamp,
  ) : Common.CauseId {
    let id = state.nextCauseId;
    state.nextCauseId := id + 1;
    let cause : Types.Cause = {
      id;
      title = input.title;
      description = input.description;
      imageRef = input.imageRef;
      goalCents = input.goalCents;
      raisedCents = 0;
      status = #draft;
      createdAt = now;
    };
    causes.add(id, cause);
    id;
  };

  /// Edit an existing cause's owner-supplied fields.
  public func editCause(
    causes : Map.Map<Common.CauseId, Types.Cause>,
    id : Common.CauseId,
    input : Types.CauseInput,
  ) : Bool {
    switch (causes.get(id)) {
      case (?cause) {
        let updated : Types.Cause = {
          id = cause.id;
          title = input.title;
          description = input.description;
          imageRef = input.imageRef;
          goalCents = input.goalCents;
          raisedCents = cause.raisedCents;
          status = cause.status;
          createdAt = cause.createdAt;
        };
        causes.add(id, updated);
        true;
      };
      case null { false };
    };
  };

  /// Set a cause's funding goal.
  public func setGoal(
    causes : Map.Map<Common.CauseId, Types.Cause>,
    id : Common.CauseId,
    goalCents : Nat,
  ) : Bool {
    switch (causes.get(id)) {
      case (?cause) {
        let updated : Types.Cause = {
          id = cause.id;
          title = cause.title;
          description = cause.description;
          imageRef = cause.imageRef;
          goalCents;
          raisedCents = cause.raisedCents;
          status = cause.status;
          createdAt = cause.createdAt;
        };
        causes.add(id, updated);
        true;
      };
      case null { false };
    };
  };

  /// Transition a cause to a new status.
  public func setStatus(
    causes : Map.Map<Common.CauseId, Types.Cause>,
    id : Common.CauseId,
    status : Types.CauseStatus,
  ) : Bool {
    switch (causes.get(id)) {
      case (?cause) {
        let updated : Types.Cause = {
          id = cause.id;
          title = cause.title;
          description = cause.description;
          imageRef = cause.imageRef;
          goalCents = cause.goalCents;
          raisedCents = cause.raisedCents;
          status;
          createdAt = cause.createdAt;
        };
        causes.add(id, updated);
        true;
      };
      case null { false };
    };
  };

  /// Add a completed donation amount to a cause's raised total.
  public func addRaised(
    causes : Map.Map<Common.CauseId, Types.Cause>,
    id : Common.CauseId,
    amountCents : Nat,
  ) : () {
    switch (causes.get(id)) {
      case (?cause) {
        let updated : Types.Cause = {
          id = cause.id;
          title = cause.title;
          description = cause.description;
          imageRef = cause.imageRef;
          goalCents = cause.goalCents;
          raisedCents = cause.raisedCents + amountCents;
          status = cause.status;
          createdAt = cause.createdAt;
        };
        causes.add(id, updated);
      };
      case null {};
    };
  };
};
