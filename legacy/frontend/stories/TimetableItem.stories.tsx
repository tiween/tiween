import React from "react"
import { Meta, Story } from "@storybook/react/types-6-0"

import TimeTableItem, {
  TimetableItemProps,
} from "../components/TimeTableList/TimeTableItem"
import { Show } from "../shared/models/show"

export default {
  component: TimeTableItem,
  title: "MovieTimeTable",
  decorators: [
    (story) => <div className="container bg-cinder py-10">{story()}</div>,
  ],
} as Meta

const Template: Story<TimetableItemProps> = (args) => {
  return <TimeTableItem {...args} />
}

const date = new Date().toISOString()
export const Primary = Template.bind({})
Primary.args = {
  id: "uniqueId",
  date,
  language: "vostfr",
  video_format: "_2d",
  premiere: false,
} as Show

export const _3D = Template.bind({})
_3D.args = {
  ...Primary.args,
  video_format: "_3d",
}
export const VF = Template.bind({})
VF.args = {
  ...Primary.args,
  language: "vf",
}

export const VOST = Template.bind({})
VOST.args = {
  ...Primary.args,
  language: "vost",
}
export const Premiere = Template.bind({})
Premiere.args = {
  ...Primary.args,
  language: "vost",
  premiere: true,
}
