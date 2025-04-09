import {
  Box,
  ButtonGroup,
  ButtonItem,
  FieldSelect,
  Fieldset,
  SelectOptionGroupProps,
  SelectOptionObject,
  Span,
} from "@looker/components";
import { ILookmlModel, ILookmlModelExplore } from "@looker/sdk";
import uniqueId from "lodash/uniqueId";
import React, { useMemo, useState } from "react";
import useSWR from "swr";
import JoinRow from "./JoinRow";
import { IJoin, IJoinConfig, ILookmlFields, TJoinType } from "./types";

// --- SVG Icon Components ---

const SvgBase: React.FC<
  React.PropsWithChildren<React.SVGProps<SVGSVGElement>>
> = ({ children, ...props }) => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      {/* Define the two circles */}
      <circle id="circleA" cx="9" cy="12" r="7" />
      <circle id="circleB" cx="15" cy="12" r="7" />

      {/* Mask for Circle A */}
      <mask id="maskA">
        <use href="#circleA" fill="white" />
      </mask>
      {/* Mask for Circle B */}
      <mask id="maskB">
        <use href="#circleB" fill="white" />
      </mask>
      {/* Mask for Intersection (A and B) */}
      <mask id="maskIntersection">
        {/* Draw B, but only where A exists */}
        <use href="#circleB" fill="white" mask="url(#maskA)" />
      </mask>
    </defs>
    {/* Draw the outlines */}
    <use href="#circleA" stroke="currentColor" strokeWidth="1" fill="none" />
    <use href="#circleB" stroke="currentColor" strokeWidth="1" fill="none" />
    {/* Render filled parts */}
    {children}
  </svg>
);

const InnerJoinIcon = () => (
  <SvgBase>
    {/* Fill a rectangle masked by the intersection */}
    <rect
      x="2"
      y="5"
      width="20"
      height="14"
      fill="currentColor"
      mask="url(#maskIntersection)"
    />
  </SvgBase>
);

const LeftJoinIcon = () => (
  <SvgBase>
    {/* Fill Circle A */}
    <use href="#circleA" fill="currentColor" />
  </SvgBase>
);

const RightJoinIcon = () => (
  <SvgBase>
    {/* Fill Circle B */}
    <use href="#circleB" fill="currentColor" />
  </SvgBase>
);

const FullOuterJoinIcon = () => (
  <SvgBase>
    {/* Fill both Circle A and Circle B */}
    <use href="#circleA" fill="currentColor" />
    <use href="#circleB" fill="currentColor" />
  </SvgBase>
);

// Cross Join visually represented as Full Outer
const CrossJoinIcon = FullOuterJoinIcon;

const JOIN_ICONS: Record<TJoinType, React.FC> = {
  inner: InnerJoinIcon,
  left_outer: LeftJoinIcon,
  right_outer: RightJoinIcon,
  full_outer: FullOuterJoinIcon,
  cross: CrossJoinIcon, // Using Full Outer icon for Cross
};

// --- Joins Component ---

interface JoinsProps {
  to_field_options: SelectOptionObject[];
  onChange?: (config: IJoinConfig) => void;
  dashboard_id: string;
}

const OPTIONS: { label: string; value: TJoinType }[] = [
  { label: "Inner", value: "inner" },
  { label: "Left", value: "left_outer" },
  { label: "Right", value: "right_outer" },
  { label: "Full", value: "full_outer" },
  { label: "Cross", value: "cross" },
];

const Joins: React.FC<JoinsProps> = ({
  to_field_options,
  onChange,
  dashboard_id,
}) => {
  const { data, isLoading } = useSWR<ILookmlFields>(
    !dashboard_id ? null : `/api/looker/fields?dashboard_id=${dashboard_id}`,
    (url) => fetch(url).then((res) => res.json())
  );

  const [joinConfig, setJoinConfig] = useState<IJoinConfig>({
    type: "left_outer",
    joins: [
      {
        uuid: uniqueId("join_"),
        to_field: "",
        from_field: "",
        from_query_id: "",
        to_query_id: "",
      },
    ],
    explore_id: data?.explores?.[0]?.id || "",
  });

  const handleJoinTypeChange = (value: string[]) => {
    const newConfig = {
      ...joinConfig,
      type: value[0] as TJoinType,
    };
    setJoinConfig(newConfig);
    onChange?.(newConfig);
  };

  const handleJoinUpdate = (updatedJoin: IJoin) => {
    const newConfig = {
      ...joinConfig,
      joins: joinConfig.joins.map((join) =>
        join.uuid === updatedJoin.uuid ? updatedJoin : join
      ),
    };
    setJoinConfig(newConfig);
    onChange?.(newConfig);
  };

  const handleJoinDelete = (uuid: string) => {
    const newConfig = {
      ...joinConfig,
      joins: joinConfig.joins.filter((join) => join.uuid !== uuid),
    };
    setJoinConfig(newConfig);
    onChange?.(newConfig);
  };

  const handleJoinAdd = () => {
    const newConfig = {
      ...joinConfig,
      joins: [
        ...joinConfig.joins,
        {
          uuid: uniqueId("join_"),
          to_field: "",
          from_field: "",
          from_query_id: "",
          to_query_id: "",
        },
      ],
    };
    setJoinConfig(newConfig);
    onChange?.(newConfig);
  };

  const grouped_fields = useMemo(() => {
    const models = data?.models.reduce((acc, model) => {
      acc[model.name] = model;
      return acc;
    }, {} as Record<string, ILookmlModel>);

    const explores = data?.explores.reduce((acc, explore) => {
      if (explore.hidden || explore.id !== joinConfig.explore_id) return acc;
      acc[explore.name] = explore;
      return acc;
    }, {} as Record<string, ILookmlModelExplore>);

    const options = Object.values(explores || {}).reduce((acc, explore) => {
      const viewGroups: Record<string, SelectOptionGroupProps> = {};

      ["dimensions"].forEach((type) => {
        explore.fields?.[type]?.forEach((field) => {
          if (field.hidden) return;

          const viewLabel = field.view_label;
          if (!viewGroups[viewLabel]) {
            viewGroups[viewLabel] = {
              label: viewLabel,
              options: [],
            };
          }

          viewGroups[viewLabel].options.push({
            label: field.label_short || field.label,
            value: field.name,
          });
        });
      });

      // Sort options within each view group
      Object.values(viewGroups).forEach((group) => {
        group.options.sort((a, b) => a.label.localeCompare(b.label));
      });

      // Convert to array and sort by view label
      const sortedGroups = Object.values(viewGroups).sort((a, b) =>
        String(a.label).localeCompare(String(b.label))
      );

      return [...acc, ...sortedGroups];
    }, [] as SelectOptionGroupProps[]);
    return { models, explores, options };
  }, [data, joinConfig.explore_id]);

  if (isLoading) {
    return <div>Loading...</div>;
  } else {
    return (
      <Box display="flex" flexDirection="column" gap="24px">
        <Box
          display="flex"
          flexDirection="row"
          gap="large"
          justifyContent="space-around"
        >
          <FieldSelect
            width="240px"
            label="Explore"
            options={data?.explores
              .map((explore) => ({
                label: explore.label,
                value: `${explore.id}`,
              }))
              .sort((a, b) => a.label.localeCompare(b.label))}
            value={joinConfig.explore_id}
            onChange={(value) => {
              setJoinConfig({
                ...joinConfig,
                explore_id: value,
              });
            }}
          />
          <Box display="flex" flexDirection="column" alignItems="center">
            <Fieldset inline>
              <ButtonGroup
                value={joinConfig.type}
                onChange={handleJoinTypeChange}
              >
                {OPTIONS.map((option) => {
                  const IconComponent = JOIN_ICONS[option.value];
                  return (
                    <ButtonItem
                      style={{ height: "100%" }}
                      key={option.value + joinConfig.type}
                      value={option.value}
                      aria-label={option.label}
                      selected={joinConfig.type === option.value}
                    >
                      <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        gap="xxsmall"
                      >
                        <IconComponent />
                        <Span fontSize="xxsmall">{option.label}</Span>
                      </Box>
                    </ButtonItem>
                  );
                })}
              </ButtonGroup>
            </Fieldset>
          </Box>
        </Box>
        <Box
          flexGrow={1}
          display="flex"
          flexDirection="column"
          gap="small"
          marginTop="24px"
        >
          {joinConfig.explore_id?.length > 0 ? (
            joinConfig.joins.map((join, index) => (
              <JoinRow
                key={join.uuid}
                join={join}
                to_field_options={to_field_options}
                from_field_options={grouped_fields.options}
                index={index}
                isLast={index === joinConfig.joins.length - 1}
                joinLength={joinConfig.joins.length}
                onUpdate={handleJoinUpdate}
                onDelete={handleJoinDelete}
                onAdd={handleJoinAdd}
              />
            ))
          ) : (
            <Box>Please select an explore first</Box>
          )}
        </Box>
      </Box>
    );
  }
};

export default Joins;
