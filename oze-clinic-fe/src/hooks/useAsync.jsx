import { useCallback, useEffect, useState} from 'react';

export default function useAsync(callback, dependencies = []) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState()
    const [value, setValue] = useState()

    const callbackMemoized = useCallback(() => {
        setLoading(true)
        setError(undefined)
        setValue(undefined)
        callback()
        .then(setValue)
        .catch(setError)
        .finally(() => setLoading(false))
    // Dependencies are supplied by the caller, so they cannot be an array literal here.
    // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
    }, dependencies)

    useEffect(() => {
        callbackMemoized()
    }, [callbackMemoized])

    return { loading, error, value }
}