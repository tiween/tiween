import styled from "styled-components"

export const StyledToolBarSelector = styled.div`
  min-width: 250px;
  z-index: 9;
  margin-left: 20px;
  &:first-child {
    margin-left: 0px;
  }
`

export const StyledLanguageSelector = styled.div`
  div[role="radiogroup"] {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-items: stretch;
    align-content: center;
  }
`
export const StyledSelectionButton = styled.div`
  input[role="radio"] {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-items: center;
    align-content: stretch;
  }
`

export const FormButtons = styled.div`
{
	display: flex;
	flex-direction: row-reverse;
	flex-wrap: wrap-reverse;
	justify-content: space-around;
	align-items: baseline;
	align-content: stretch;
}

`

export const StyledEventsCalendar = styled.div`
  td.fc-timegrid-slot {
    border-width: 2.5px;
    border-color: #808080;
    &.fc-timegrid-slot-minor {
      border-width: 1.5px;
      border-color: #a0a0a0;
    }
  }
`

export const StyledCalendarEvent = styled.div`
  position: relative;
  height: 100%;
  button.delete-showtime {
    position: absolute;
    bottom: 0;
    left: 0;
  }
`
export const SyledButtonAsTab = styled.button`
  $bg: #332f35;
  $fg: lighten($bg, 20%);
  $borderWidth: 3px;
  @import url("https://fonts.googleapis.com/css?family=Roboto");
  input[type="radio"] {
    position: absolute;
    visibility: hidden;
    display: none;
  }

  label {
    color: lighten($bg, 40%);
    display: inline-block;
    cursor: pointer;
    font-weight: bold;
    padding: 5px 20px;
  }

  input[type="radio"]:checked + label {
    color: lighten($bg, 60%);
    background: $fg;
  }

  label + input[type="radio"] + label {
    border-left: solid $borderWidth $fg;
  }
  .radio-group {
    border: solid $borderWidth $fg;
    display: inline-block;
    margin: 20px;
    border-radius: 10px;
    overflow: hidden;
  }
`

export const StyledEventSubForm = styled.div`
  margin-bottom: 10px;
`

export const StyledShowtimeTypeSelectorWrapper = styled.div`
  display: flex;
  flex-direction: row;
  overflow: hidden;
  margin-top: 4.3rem;
  border-radius: 2px;
  box-shadow: 0 2px 4px #e3e9f3;
  button {
    box-shadow:
      1px 0 0px rgba(#dbdbdb, 0.5),
      inset 0px -1px 0px -2px rgba(#dbdbdb, 0.5);
    background-color: #f5f5f5;

    &:first-child {
      border-radius: 2px 0 0 0;
    }
    &:last-child {
      border-radius: 0 2px 0 0;
    }
    &.headerButton {
      position: relative;
      display: flex;
      flex: 1 100%;
      height: 3.6rem;
      border-radius: 2px 0 0 0;
      background-color: darken(#f5f5f5, 50%);
      text-decoration: none !important;
      font-family: Lato;
      font-size: 1.3rem;
      color: #333740 !important;
      line-height: 1.6rem;
    }
    &.active {
      z-index: 10;
      background-color: #ffffff !important;
      font-weight: bold;
      text-decoration: none !important;
      box-shadow: 0 0 2px rgba(#dbdbdb, 0.5);
      border-top: 0.2rem solid #1c5de7;
    }
    .textWrapper {
      margin: auto;
      text-transform: capitalize;
    }
  }
`
