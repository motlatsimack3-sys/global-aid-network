import Map "mo:core/Map";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Types "../types/causes";
import CausesLib "../lib/causes";

mixin (
  accessControlState : AccessControl.AccessControlState,
  causes : Map.Map<Common.CauseId, Types.Cause>,
  state : { var nextCauseId : Nat; var nextDonationId : Nat },
) {
  /// Public: list published causes with goal, raised and progress.
  public query func listCauses() : async [Types.CauseView] {
    CausesLib.listPublished(causes);
  };

  /// Public: read one cause by id.
  public query func getCause(id : Common.CauseId) : async ?Types.CauseView {
    CausesLib.getCause(causes, id);
  };

  /// Owner-only: create a draft cause.
  public shared ({ caller }) func createCause(input : Types.CauseInput) : async Common.CauseId {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only the site owner can create a cause");
    };
    CausesLib.createCause(causes, state, input, Time.now());
  };

  /// Owner-only: edit a cause's title, description, image and goal.
  public shared ({ caller }) func editCause(id : Common.CauseId, input : Types.CauseInput) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only the site owner can edit a cause");
    };
    CausesLib.editCause(causes, id, input);
  };

  /// Owner-only: set a cause's funding goal.
  public shared ({ caller }) func setCauseGoal(id : Common.CauseId, goalCents : Nat) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only the site owner can set a cause goal");
    };
    CausesLib.setGoal(causes, id, goalCents);
  };

  /// Owner-only: publish a cause.
  public shared ({ caller }) func publishCause(id : Common.CauseId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only the site owner can publish a cause");
    };
    CausesLib.setStatus(causes, id, #published);
  };

  /// Owner-only: close a cause.
  public shared ({ caller }) func closeCause(id : Common.CauseId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only the site owner can close a cause");
    };
    CausesLib.setStatus(causes, id, #closed);
  };

  /// Owner-only: list every cause including drafts and closed ones.
  public query ({ caller }) func listAllCauses() : async [Types.CauseView] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only the site owner can list all causes");
    };
    causes.values().map(func(cause) = CausesLib.toView(cause)).toArray();
  };
};
