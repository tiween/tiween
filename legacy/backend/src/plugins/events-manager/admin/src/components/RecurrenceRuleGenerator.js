import React, { useReducer } from "react"
import { Box as BaseBox } from "@strapi/design-system/Box"
import { DatePicker } from "@strapi/design-system/DatePicker"
import { Flex } from "@strapi/design-system/Flex"
import { NumberInput } from "@strapi/design-system/NumberInput"
import { Option, Select } from "@strapi/design-system/Select"
import { Stack } from "@strapi/design-system/Stack"
import { Typography } from "@strapi/design-system/Typography"
import set from "lodash/set"
import { datetime, RRule, RRuleSet, rrulestr } from "rrule"
import styled from "styled-components"

const MODE = {
  AFTER: "after",
  DATE: "date",
}

console.log("datetime", datetime)

const Box = styled(BaseBox)`
  margin-top: 10px;
`

const RecurrenceRuleGenerator = ({
  value = "",
  onChange = null,
  startDate,
}) => {
  // const dtstart = datetime.fromDate(startDate);

  const [state, setState] = useReducer(
    (state, newState) => ({ state, ...newState }),
    {
      mode: null,
      endDate: null,
      executions: 1,
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        tzid: "Africa/Tunis",
      },
    }
  )

  const handleOnChange = ({ target }) => {
    set(newData, target.name, target.value)
    onChange(rrule)
  }

  return (
    <Box padding={4} hasRadius shadow="filterShadow">
      <Typography variant="delta">Tout les jours</Typography>
      <Stack horizontal spacing={2}>
        <Select
          id="endMode"
          placeholder="Fin"
          hint="Mode de fin de la répétition"
          onChange={(value) => {
            setState({ mode: value })
          }}
        >
          <Option value={"after"}>Après...</Option>
          <Option value={"date"}>Date de Fin</Option>
        </Select>
        <>
          {state.mode === MODE.AFTER && (
            <NumberInput
              placeholder="nombre d'executions"
              aria-label="occurencesCount"
              name="occurencesCount"
              hint="Description line"
              error={undefined}
              value={state.executions}
              onValueChange={(value) => {}}
            />
          )}

          {state.mode === MODE.DATE && (
            <DatePicker
              placeholder="Date de fin"
              aria-label="endDate"
              name="endDate"
              hint="Date de la fin des répétition"
              error={undefined}
              onChange={(value) => {
                setState({
                  rrule: { ...state.rrule, until: datetime.fromDate(value) },
                })
              }}
              selectedDate={state.endDate}
              clearLabel={"Clear the datepicker"}
              onClear={() => setSate({ endDate: null })}
              selectedDateLabel={(formattedDate) => {
                return `Date picker, current is ${formattedDate}`
              }}
            />
          )}
        </>
      </Stack>
    </Box>
  )
}

export default RecurrenceRuleGenerator
