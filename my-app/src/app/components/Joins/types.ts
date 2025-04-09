import { ILookmlModel, ILookmlModelExplore } from "@looker/sdk";

export type TJoinType =
  | "inner"
  | "left_outer"
  | "right_outer"
  | "full_outer"
  | "cross";

export interface IJoin {
  uuid: string;
  to_field: string;
  from_field: string;
  from_query_id: string;
  to_query_id: string;
}

export interface IJoinConfig {
  type: TJoinType;
  joins: IJoin[];
  explore_id: string;
}

export interface ILookmlFields {
  models: ILookmlModel[];
  explores: ILookmlModelExplore[];
}
