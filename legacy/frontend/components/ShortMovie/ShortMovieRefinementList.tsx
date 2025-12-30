/* eslint-disable @typescript-eslint/explicit-function-return-type */
import classNames from "classnames"
import { connectRefinementList, Highlight } from "react-instantsearch-dom"

const RefinementList = ({ items, isFromSearch, refine, createURL }) => {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.label}>
          <a
            className={classNames({
              "font-bold": item.isRefined,
            })}
            href={createURL(item.value)}
            onClick={(event) => {
              event.preventDefault()
              refine(item.value)
            }}
          >
            {isFromSearch ? (
              <Highlight attribute="label" hit={item} />
            ) : (
              item.label
            )}{" "}
            ({item.count})
          </a>
        </li>
      ))}
    </ul>
  )
}

const ShortMovieRefinementList = connectRefinementList(RefinementList)

export default ShortMovieRefinementList
